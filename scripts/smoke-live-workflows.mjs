import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

function parseEnvFile(path) {
  const env = {};

  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([^#=]+)=(.*)$/);

      if (!match) {
        continue;
      }

      env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  return env;
}

const env = {
  ...parseEnvFile(".env.local"),
  ...process.env,
};
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !publishableKey || !serviceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or SUPABASE_SERVICE_KEY.",
  );
}

const service = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const runId = `codex-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;
const password = `Smoke-${randomUUID()}-aA1!`;
const createdUsers = [];
const checks = [];
const tableExistence = new Map();
const columnExistence = new Map();

function userClient() {
  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function mark(label) {
  checks.push(label);
}

function expectError(result, label) {
  if (!result.error) {
    throw new Error(`${label} unexpectedly succeeded.`);
  }

  mark(label);
}

function expectNoError(result, label) {
  if (result.error) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }

  mark(label);
  return result.data;
}

function isMissingRelationError(error) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("Could not find the table")
  );
}

function isMissingColumnError(error, column) {
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    error?.message?.includes(`'${column}' column`) ||
    error?.message?.includes(`column ${column} does not exist`)
  );
}

async function tableExists(table) {
  if (tableExistence.has(table)) {
    return tableExistence.get(table);
  }

  const { error } = await service.from(table).select("id").limit(1);
  const exists = !error || !isMissingRelationError(error);

  if (error && exists) {
    throw new Error(`Check ${table} table failed: ${error.message}`);
  }

  tableExistence.set(table, exists);
  return exists;
}

async function columnExists(table, column) {
  const key = `${table}.${column}`;

  if (columnExistence.has(key)) {
    return columnExistence.get(key);
  }

  if (!(await tableExists(table))) {
    columnExistence.set(key, false);
    return false;
  }

  const { error } = await service
    .from(table)
    .select(column)
    .limit(1);
  const exists = !error || !isMissingColumnError(error, column);

  if (error && exists) {
    throw new Error(`Check ${key} column failed: ${error.message}`);
  }

  columnExistence.set(key, exists);
  return exists;
}

async function firstExistingColumn(table, columns) {
  for (const column of columns) {
    if (await columnExists(table, column)) {
      return column;
    }
  }

  return null;
}

async function createRoleUser(role) {
  const email = `${runId}-${role}-${createdUsers.length}@example.com`;
  const name = `Codex Smoke ${role}`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (created.error || !created.data.user) {
    throw new Error(`Create ${role} user failed: ${created.error?.message}`);
  }

  const user = created.data.user;
  createdUsers.push({ id: user.id, email });

  const updated = await service.auth.admin.updateUserById(user.id, {
    app_metadata: { role },
    user_metadata: { name },
  });

  if (updated.error) {
    throw new Error(`Assign ${role} role failed: ${updated.error.message}`);
  }

  expectNoError(
    await service.from("users").upsert({
      id: user.id,
      email,
      name,
      role,
      password_hash: "",
    }),
    `profile upsert for ${role}`,
  );

  const client = userClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });

  if (signedIn.error || signedIn.data.user?.app_metadata?.role !== role) {
    throw new Error(`Sign in ${role} user failed or role claim was stale.`);
  }

  return { client, id: user.id, role };
}

async function deleteByUserId(table, column, ids) {
  if (!ids.length) {
    return;
  }

  const { error } = await service.from(table).delete().in(column, ids);

  if (error) {
    throw new Error(`Cleanup ${table} failed: ${error.message}`);
  }
}

async function deleteByAvailableUserColumn(table, columns, ids) {
  if (!ids.length || !(await tableExists(table))) {
    return;
  }

  const column = await firstExistingColumn(table, columns);

  if (!column) {
    return;
  }

  await deleteByUserId(table, column, ids);
}

async function countByUserId(table, column, ids, selectColumn) {
  if (!ids.length) {
    return 0;
  }

  const { count, error } = await service
    .from(table)
    .select(selectColumn, { count: "exact", head: true })
    .in(column, ids);

  if (error) {
    throw new Error(`Cleanup verification ${table} failed: ${error.message}`);
  }

  return count ?? 0;
}

async function cleanup() {
  const ids = createdUsers.map((user) => user.id);
  const errors = [];

  async function attempt(label, action) {
    try {
      await action();
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
  }

  await attempt("delete public exam sets", () =>
    deleteByUserId("public_exam_sets", "admin_id", ids),
  );
  await attempt("delete groups", () =>
    deleteByUserId("groups", "teacher_id", ids),
  );
  await attempt("delete posts", () => deleteByUserId("posts", "teacher_id", ids));
  await attempt("delete questions", () =>
    deleteByAvailableUserColumn(
      "questions",
      ["author_id", "teacher_id", "owner_id", "created_by"],
      ids,
    ),
  );
  await attempt("delete question sets", () =>
    deleteByAvailableUserColumn(
      "question_sets",
      ["teacher_id", "author_id", "owner_id", "created_by"],
      ids,
    ),
  );
  await attempt("delete comments", () =>
    deleteByUserId("comments", "user_id", ids),
  );
  await attempt("delete reactions", () =>
    deleteByUserId("reactions", "user_id", ids),
  );
  await attempt("delete public exam attempts", () =>
    deleteByUserId("public_exam_attempts", "student_id", ids),
  );
  await attempt("delete submissions", () =>
    deleteByUserId("submissions", "student_id", ids),
  );
  await attempt("delete group memberships", () =>
    deleteByUserId("group_members", "student_id", ids),
  );
  await attempt("delete profiles before auth users", () =>
    deleteByUserId("users", "id", ids),
  );

  for (const user of createdUsers) {
    await attempt("delete auth user", async () => {
      const { error } = await service.auth.admin.deleteUser(user.id);

      if (error) {
        throw error;
      }
    });
  }

  await attempt("delete profiles after auth users", () =>
    deleteByUserId("users", "id", ids),
  );
  await attempt("verify profile cleanup", async () => {
    const profileCount = await countByUserId("users", "id", ids, "id");

    if (profileCount > 0) {
      throw new Error(`${profileCount} temporary profile rows remain`);
    }
  });

  if (errors.length) {
    throw new Error(`Cleanup failed: ${errors.join("; ")}`);
  }
}

async function maybeCreateTeacherQuestionSet(teacher, student) {
  if (!(await tableExists("question_sets"))) {
    mark("question_sets table not present; typed set smoke skipped");
    return null;
  }

  const ownerColumn = await firstExistingColumn("question_sets", [
    "teacher_id",
    "author_id",
    "owner_id",
    "created_by",
  ]);

  assert(
    ownerColumn,
    "question_sets must have an owner column for teacher-scoped cleanup.",
  );

  const invalidSet = { [ownerColumn]: student.id };
  const teacherSet = { [ownerColumn]: teacher.id };

  if (await columnExists("question_sets", "title")) {
    invalidSet.title = `${runId} invalid question set`;
    teacherSet.title = `${runId} teacher question set`;
  }

  if (await columnExists("question_sets", "description")) {
    invalidSet.description =
      "Student-owned question sets should not pass teacher RLS.";
    teacherSet.description = "Google-Forms-like smoke fixture";
  }

  expectError(
    await student.client
      .from("question_sets")
      .insert(invalidSet)
      .select("id")
      .single(),
    "student cannot create teacher question set",
  );

  return expectNoError(
    await teacher.client
      .from("question_sets")
      .insert(teacherSet)
      .select()
      .single(),
    "teacher creates question set",
  );
}

async function questionInsertRow({
  userId,
  content,
  options,
  correctAnswer,
  source,
  questionSetId = null,
  originalId = null,
  sortOrder = 0,
  questionType = "multiple_choice",
  isScored = true,
}) {
  const row = {};
  const ownerColumn = await firstExistingColumn("questions", [
    "author_id",
    "teacher_id",
    "owner_id",
    "created_by",
  ]);
  const textColumn = await firstExistingColumn("questions", [
    "content",
    "prompt",
    "question_text",
    "title",
  ]);
  const typeColumn = await firstExistingColumn("questions", [
    "question_type",
    "type",
  ]);

  if (ownerColumn) {
    row[ownerColumn] = userId;
  }

  if (questionSetId && (await columnExists("questions", "question_set_id"))) {
    row.question_set_id = questionSetId;
  }

  if (textColumn) {
    row[textColumn] = content;
  }

  if (typeColumn) {
    row[typeColumn] = questionType;
  }

  if (await columnExists("questions", "options")) {
    row.options = options;
  }

  if (await columnExists("questions", "choices")) {
    row.choices = options;
  }

  if (await columnExists("questions", "correct_answer")) {
    row.correct_answer = correctAnswer;
  }

  if (await columnExists("questions", "correct_response")) {
    row.correct_response = correctAnswer;
  }

  if (await columnExists("questions", "answer_key")) {
    row.answer_key =
      questionType === "checkboxes"
        ? { answers: Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer] }
        : { answer: correctAnswer };
  }

  if (await columnExists("questions", "settings")) {
    row.settings = {};
  }

  if (await columnExists("questions", "points")) {
    row.points = isScored ? 1 : 0;
  }

  if (await columnExists("questions", "is_scored")) {
    row.is_scored = isScored;
  }

  if (await columnExists("questions", "grading_mode")) {
    row.grading_mode = isScored ? "auto" : "none";
  }

  if (await columnExists("questions", "sort_order")) {
    row.sort_order = sortOrder;
  }

  if (source && (await columnExists("questions", "source"))) {
    row.source = source;
  }

  if (originalId && (await columnExists("questions", "original_id"))) {
    row.original_id = originalId;
  }

  return row;
}

function questionContent(question) {
  return question.content ?? question.prompt ?? question.question_text ?? question.title;
}

function questionOptions(question) {
  return question.options ?? question.choices ?? [];
}

function questionAnswer(question) {
  const answer =
    question.correct_answer ?? question.correct_response ?? question.answer_key;

  if (answer) {
    return answer;
  }

  const options = questionOptions(question);
  return Array.isArray(options) && options.length ? options[0] : "A";
}

async function examQuestionInsertRow(exam, question, sortOrder) {
  const row = {
    exam_id: exam.id,
    question_id: question.id,
    sort_order: sortOrder,
  };

  if (await columnExists("exam_questions", "snapshot_content")) {
    row.snapshot_content = questionContent(question);
  }

  if (await columnExists("exam_questions", "snapshot_options")) {
    row.snapshot_options = questionOptions(question);
  }

  if (await columnExists("exam_questions", "snapshot_correct_answer")) {
    row.snapshot_correct_answer = questionAnswer(question);
  }

  if (await columnExists("exam_questions", "snapshot_answer_key")) {
    row.snapshot_answer_key =
      question.answer_key && Object.keys(question.answer_key).length
        ? question.answer_key
        : { answer: questionAnswer(question) };
  }

  if (await columnExists("exam_questions", "snapshot_settings")) {
    row.snapshot_settings = question.settings ?? {};
  }

  if (await columnExists("exam_questions", "snapshot_grading_mode")) {
    row.snapshot_grading_mode = question.grading_mode ?? "auto";
  }

  if (await columnExists("exam_questions", "snapshot_points")) {
    row.snapshot_points = question.points ?? 1;
  }

  if (await columnExists("exam_questions", "snapshot_is_required")) {
    row.snapshot_is_required = question.is_required ?? true;
  }

  if (
    question.question_set_id &&
    (await columnExists("exam_questions", "source_question_set_id"))
  ) {
    row.source_question_set_id = question.question_set_id;
  }

  const typeColumn = await firstExistingColumn("exam_questions", [
    "snapshot_question_type",
    "question_type",
    "type",
  ]);

  if (typeColumn) {
    row[typeColumn] = question.question_type ?? question.type ?? "multiple_choice";
  }

  return row;
}

async function publicSetQuestionInsertRow(set, question, sortOrder) {
  const row = {
    set_id: set.id,
    question_id: question.id,
    sort_order: sortOrder,
  };

  if (await columnExists("public_exam_set_questions", "snapshot_content")) {
    row.snapshot_content = questionContent(question);
  }

  if (await columnExists("public_exam_set_questions", "snapshot_options")) {
    row.snapshot_options = questionOptions(question);
  }

  if (await columnExists("public_exam_set_questions", "snapshot_correct_answer")) {
    row.snapshot_correct_answer = questionAnswer(question);
  }

  if (await columnExists("public_exam_set_questions", "snapshot_answer_key")) {
    row.snapshot_answer_key =
      question.answer_key && Object.keys(question.answer_key).length
        ? question.answer_key
        : { answer: questionAnswer(question) };
  }

  if (await columnExists("public_exam_set_questions", "snapshot_settings")) {
    row.snapshot_settings = question.settings ?? {};
  }

  if (await columnExists("public_exam_set_questions", "snapshot_grading_mode")) {
    row.snapshot_grading_mode = question.grading_mode ?? "auto";
  }

  if (await columnExists("public_exam_set_questions", "snapshot_points")) {
    row.snapshot_points = question.points ?? 1;
  }

  if (await columnExists("public_exam_set_questions", "snapshot_is_required")) {
    row.snapshot_is_required = question.is_required ?? true;
  }

  if (
    question.question_set_id &&
    (await columnExists("public_exam_set_questions", "source_question_set_id"))
  ) {
    row.source_question_set_id = question.question_set_id;
  }

  if (await columnExists("public_exam_set_questions", "snapshot_question_type")) {
    row.snapshot_question_type =
      question.question_type ?? question.type ?? "multiple_choice";
  }

  return row;
}

function snapshotAnswer(question) {
  return (
    question.snapshot_correct_answer ??
    question.snapshot_correct_response ??
    question.snapshot_answer_key ??
    questionAnswer(question)
  );
}

async function submissionAnswerInsertRow({
  submissionId,
  examQuestion,
  answer,
  isCorrect,
}) {
  const row = {
    submission_id: submissionId,
  };

  if (await columnExists("submission_answers", "exam_question_id")) {
    row.exam_question_id = examQuestion.id;
  }

  if (
    examQuestion.question_id &&
    (await columnExists("submission_answers", "question_id"))
  ) {
    row.question_id = examQuestion.question_id;
  }

  if (await columnExists("submission_answers", "answer")) {
    row.answer = answer;
  }

  if (await columnExists("submission_answers", "answer_json")) {
    row.answer_json = answer;
  }

  if (await columnExists("submission_answers", "response")) {
    row.response = answer;
  }

  if (await columnExists("submission_answers", "response_json")) {
    row.response_json = answer;
  }

  if (await columnExists("submission_answers", "is_correct")) {
    row.is_correct = isCorrect;
  }

  if (await columnExists("submission_answers", "points_awarded")) {
    row.points_awarded = isCorrect ? 1 : 0;
  }

  return row;
}

async function run() {
  const teacher = await createRoleUser("teacher");
  const student = await createRoleUser("student");
  const secondStudent = await createRoleUser("student");
  const outsider = await createRoleUser("student");
  const admin = await createRoleUser("admin");
  const questionSet = await maybeCreateTeacherQuestionSet(teacher, student);

  expectError(
    await student.client
      .from("groups")
      .insert({ teacher_id: student.id, name: `${runId} invalid group` })
      .select("id")
      .single(),
    "student cannot create teacher group",
  );

  const group = expectNoError(
    await teacher.client
      .from("groups")
      .insert({ teacher_id: teacher.id, name: `${runId} group` })
      .select("id")
      .single(),
    "teacher creates group",
  );

  expectNoError(
    await student.client
      .from("group_members")
      .insert({ group_id: group.id, student_id: student.id }),
    "student joins group",
  );
  expectNoError(
    await secondStudent.client
      .from("group_members")
      .insert({ group_id: group.id, student_id: secondStudent.id }),
    "second student joins group",
  );

  expectError(
    await student.client
      .from("questions")
      .insert(
        await questionInsertRow({
          userId: student.id,
          content: `${runId} invalid question`,
          options: ["A", "B"],
          correctAnswer: "A",
          source: "teacher",
          questionSetId: questionSet?.id,
        }),
      )
      .select("id")
      .single(),
    "student cannot create teacher question",
  );

  const teacherQuestionRows = expectNoError(
    await teacher.client
      .from("questions")
      .insert([
        await questionInsertRow({
          userId: teacher.id,
          content: `${runId} question one`,
          options: ["A", "B"],
          correctAnswer: "A",
          source: "teacher",
          questionSetId: questionSet?.id,
          sortOrder: 0,
        }),
        await questionInsertRow({
          userId: teacher.id,
          content: `${runId} question two`,
          options: ["C", "D"],
          correctAnswer: "D",
          source: "teacher",
          questionSetId: questionSet?.id,
          sortOrder: 1,
        }),
      ])
      .select(),
    "teacher creates questions",
  );
  const teacherQuestions = [...teacherQuestionRows].sort((a, b) =>
    questionContent(a).localeCompare(questionContent(b)),
  );
  assert(teacherQuestions.length === 2, "Expected two teacher questions.");

  const scheduledStartsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const scheduledEndsAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const exam = expectNoError(
    await teacher.client
      .from("exams")
      .insert({
        group_id: group.id,
        title: `${runId} scheduled exam`,
        starts_at: scheduledStartsAt,
        ends_at: scheduledEndsAt,
      })
      .select("id")
      .single(),
    "teacher creates scheduled exam",
  );

  const examQuestions = await Promise.all(
    teacherQuestions.map((question, index) =>
      examQuestionInsertRow(exam, question, index),
    ),
  );
  const insertedExamQuestionRows = expectNoError(
    await teacher.client
      .from("exam_questions")
      .insert(examQuestions)
      .select(),
    "teacher attaches scheduled exam questions",
  );
  const insertedExamQuestions = [...insertedExamQuestionRows].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  assert(
    expectNoError(
      await student.client.from("exams").select("id").eq("id", exam.id).single(),
      "joined student reads group exam",
    ).id === exam.id,
    "Joined student did not read the exam.",
  );

  const outsiderExam = expectNoError(
    await outsider.client
      .from("exams")
      .select("id")
      .eq("id", exam.id)
      .maybeSingle(),
    "non-member exam lookup is filtered",
  );
  assert(!outsiderExam, "Non-member student could read a group exam.");

  expectNoError(
    await service
      .from("exams")
      .update({
        starts_at: new Date(Date.now() - 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        closed_at: null,
      })
      .eq("id", exam.id),
    "service activates exam for submission smoke",
  );

  const firstSubmission = expectNoError(
    await service
      .from("submissions")
      .insert({
        exam_id: exam.id,
        student_id: student.id,
        score: 1,
        total_questions: 2,
      })
      .select("id")
      .single(),
    "active exam accepts student submission",
  );
  expectNoError(
    await service.from("submission_answers").insert([
      await submissionAnswerInsertRow({
        submissionId: firstSubmission.id,
        examQuestion: insertedExamQuestions[0],
        answer: snapshotAnswer(insertedExamQuestions[0]),
        isCorrect: true,
      }),
      await submissionAnswerInsertRow({
        submissionId: firstSubmission.id,
        examQuestion: insertedExamQuestions[1],
        answer: "C",
        isCorrect: false,
      }),
    ]),
    "submission answer snapshots are stored",
  );

  expectNoError(
    await service
      .from("submissions")
      .insert({
        exam_id: exam.id,
        student_id: secondStudent.id,
        score: 2,
        total_questions: 2,
      })
      .select("id")
      .single(),
    "active exam accepts second student submission",
  );

  const expiredExam = expectNoError(
    await service
      .from("exams")
      .insert({
        group_id: group.id,
        title: `${runId} expired exam`,
        starts_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        closed_at: new Date().toISOString(),
      })
      .select("id")
      .single(),
    "service creates expired exam fixture",
  );
  expectError(
    await service
      .from("submissions")
      .insert({
        exam_id: expiredExam.id,
        student_id: student.id,
        score: 0,
        total_questions: 1,
      })
      .select("id")
      .single(),
    "expired exam rejects late submission",
  );

  expectNoError(
    await service
      .from("exams")
      .update({
        ends_at: new Date(Date.now() - 1000).toISOString(),
        closed_at: new Date().toISOString(),
      })
      .eq("id", exam.id),
    "service closes exam for merit smoke",
  );

  const meritRows = expectNoError(
    await student.client
      .from("submissions")
      .select("student_id,score,submitted_at")
      .eq("exam_id", exam.id)
      .order("score", { ascending: false })
      .order("submitted_at", { ascending: true }),
    "student reads closed exam merit rows",
  );
  assert(meritRows.length === 2, "Expected two merit rows after close.");
  assert(
    meritRows[0].student_id === secondStudent.id &&
      meritRows[1].student_id === student.id,
    "Merit rows were not ranked by score descending.",
  );

  const progressRows = expectNoError(
    await student.client
      .from("submissions")
      .select("id,score,total_questions,submitted_at")
      .eq("student_id", student.id)
      .eq("exam_id", exam.id),
    "student reads own progress row",
  );
  assert(progressRows.length === 1, "Expected one progress row for student.");

  const wrongAnswers = expectNoError(
    await student.client
      .from("submission_answers")
      .select("id,is_correct")
      .eq("submission_id", firstSubmission.id)
      .eq("is_correct", false),
    "student reads own wrong answers for practice",
  );
  assert(wrongAnswers.length === 1, "Expected one wrong answer for practice.");

  const adminQuestion = expectNoError(
    await admin.client
      .from("questions")
      .insert(
        await questionInsertRow({
          userId: admin.id,
          content: `${runId} public question`,
          options: ["True", "False"],
          correctAnswer: "True",
          source: "admin",
          sortOrder: 0,
        }),
      )
      .select()
      .single(),
    "admin creates public source question",
  );
  expectError(
    await teacher.client
      .from("public_exam_sets")
      .insert({
        admin_id: teacher.id,
        title: `${runId} invalid public set`,
        is_published: true,
      })
      .select("id")
      .single(),
    "teacher cannot create admin public set",
  );

  const publishedSet = expectNoError(
    await admin.client
      .from("public_exam_sets")
      .insert({
        admin_id: admin.id,
        title: `${runId} published set`,
        is_published: true,
      })
      .select("id")
      .single(),
    "admin creates published public set",
  );
  const draftSet = expectNoError(
    await admin.client
      .from("public_exam_sets")
      .insert({
        admin_id: admin.id,
        title: `${runId} draft set`,
        is_published: false,
      })
      .select("id")
      .single(),
    "admin creates draft public set",
  );
  const setQuestion = expectNoError(
    await admin.client
      .from("public_exam_set_questions")
      .insert(await publicSetQuestionInsertRow(publishedSet, adminQuestion, 0))
      .select()
      .single(),
    "admin attaches public set question",
  );

  assert(
    expectNoError(
      await student.client
        .from("public_exam_sets")
        .select("id")
        .eq("id", publishedSet.id)
        .single(),
      "student reads published public set",
    ).id === publishedSet.id,
    "Student did not read published public set.",
  );
  const invisibleDraft = expectNoError(
    await student.client
      .from("public_exam_sets")
      .select("id")
      .eq("id", draftSet.id)
      .maybeSingle(),
    "student draft public set lookup is filtered",
  );
  assert(!invisibleDraft, "Student could read a draft public set.");

  expectError(
    await student.client
      .from("public_exam_attempts")
      .insert({
        set_id: publishedSet.id,
        student_id: student.id,
        score: 1,
        total_questions: 1,
      })
      .select("id")
      .single(),
    "student cannot directly insert public exam attempt",
  );
  const publicAttempt = expectNoError(
    await service
      .from("public_exam_attempts")
      .insert({
        set_id: publishedSet.id,
        student_id: student.id,
        score: 1,
        total_questions: 1,
      })
      .select("id")
      .single(),
    "service stores scored public exam attempt",
  );
  expectNoError(
    await service.from("public_exam_attempt_answers").insert({
      attempt_id: publicAttempt.id,
      set_question_id: setQuestion.id,
      question_id: setQuestion.question_id,
      answer: setQuestion.snapshot_correct_answer,
      is_correct: true,
    }),
    "service stores public exam attempt answer",
  );
  assert(
    expectNoError(
      await student.client
        .from("public_exam_attempts")
        .select("id,score,total_questions")
        .eq("id", publicAttempt.id)
        .single(),
      "student reads own public exam score",
    ).score === 1,
    "Student did not read own public exam score.",
  );
  const otherStudentAttempt = expectNoError(
    await secondStudent.client
      .from("public_exam_attempts")
      .select("id")
      .eq("id", publicAttempt.id)
      .maybeSingle(),
    "other student public attempt lookup is filtered",
  );
  assert(!otherStudentAttempt, "Another student could read public exam attempt.");

  const teacherSetRead = expectNoError(
    await teacher.client
      .from("public_exam_sets")
      .select("*, public_exam_set_questions(*)")
      .eq("id", publishedSet.id)
      .eq("is_published", true)
      .single(),
    "teacher reads published set for import",
  );
  const importedQuestions = (teacherSetRead.public_exam_set_questions ?? []).map(
    async (question, index) =>
      questionInsertRow({
        userId: teacher.id,
        content: question.snapshot_content,
        options: question.snapshot_options,
        correctAnswer: question.snapshot_correct_answer,
        source: "teacher",
        questionSetId: questionSet?.id,
        originalId: question.question_id,
        sortOrder: index + 10,
      }),
  );
  const imported = expectNoError(
    await teacher.client
      .from("questions")
      .insert(await Promise.all(importedQuestions))
      .select()
      .single(),
    "teacher imports public set question",
  );
  assert(
    !("original_id" in imported) || imported.original_id === adminQuestion.id,
    "Imported question did not preserve original_id.",
  );
}

let cleanupError = null;

try {
  await run();
} finally {
  try {
    await cleanup();
  } catch (error) {
    cleanupError = error;
  }
}

if (cleanupError) {
  throw cleanupError;
}

console.log(
  JSON.stringify(
    {
      status: "ok",
      checks: checks.length,
      covered: [
        "role gating",
        "group exam creation and visibility",
        "active submission and expired rejection",
        "merit ranking after close",
        "progress and practice reads",
        "admin-only public sets",
        "public exam scoring reads",
        "teacher public-set import original_id",
      ],
      cleanup: "completed",
    },
    null,
    2,
  ),
);
