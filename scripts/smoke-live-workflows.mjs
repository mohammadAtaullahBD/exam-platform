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
    deleteByUserId("questions", "author_id", ids),
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
  await attempt("delete profiles", () => deleteByUserId("users", "id", ids));

  for (const user of createdUsers) {
    await attempt("delete auth user", async () => {
      const { error } = await service.auth.admin.deleteUser(user.id);

      if (error) {
        throw error;
      }
    });
  }

  if (errors.length) {
    throw new Error(`Cleanup failed: ${errors.join("; ")}`);
  }
}

async function run() {
  const teacher = await createRoleUser("teacher");
  const student = await createRoleUser("student");
  const secondStudent = await createRoleUser("student");
  const outsider = await createRoleUser("student");
  const admin = await createRoleUser("admin");

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
      .insert({
        author_id: student.id,
        content: `${runId} invalid question`,
        options: ["A", "B"],
        correct_answer: "A",
        source: "teacher",
      })
      .select("id")
      .single(),
    "student cannot create teacher question",
  );

  const teacherQuestionRows = expectNoError(
    await teacher.client
      .from("questions")
      .insert([
        {
          author_id: teacher.id,
          content: `${runId} question one`,
          options: ["A", "B"],
          correct_answer: "A",
          source: "teacher",
        },
        {
          author_id: teacher.id,
          content: `${runId} question two`,
          options: ["C", "D"],
          correct_answer: "D",
          source: "teacher",
        },
      ])
      .select("id,content,options,correct_answer"),
    "teacher creates questions",
  );
  const teacherQuestions = [...teacherQuestionRows].sort((a, b) =>
    a.content.localeCompare(b.content),
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

  const examQuestions = teacherQuestions.map((question, index) => ({
    exam_id: exam.id,
    question_id: question.id,
    sort_order: index,
    snapshot_content: question.content,
    snapshot_options: question.options,
    snapshot_correct_answer: question.correct_answer,
  }));
  const insertedExamQuestionRows = expectNoError(
    await teacher.client
      .from("exam_questions")
      .insert(examQuestions)
      .select("id,question_id,sort_order,snapshot_correct_answer"),
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
      {
        submission_id: firstSubmission.id,
        exam_question_id: insertedExamQuestions[0].id,
        question_id: insertedExamQuestions[0].question_id,
        answer: insertedExamQuestions[0].snapshot_correct_answer,
        is_correct: true,
      },
      {
        submission_id: firstSubmission.id,
        exam_question_id: insertedExamQuestions[1].id,
        question_id: insertedExamQuestions[1].question_id,
        answer: "C",
        is_correct: false,
      },
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

  const post = expectNoError(
    await teacher.client
      .from("posts")
      .insert({ teacher_id: teacher.id, content: `${runId} teacher post` })
      .select("id")
      .single(),
    "teacher creates post",
  );
  assert(
    expectNoError(
      await student.client.from("posts").select("id").eq("id", post.id).single(),
      "student reads teacher post",
    ).id === post.id,
    "Student did not read teacher post.",
  );
  expectNoError(
    await student.client
      .from("reactions")
      .insert({ post_id: post.id, user_id: student.id, type: "like" })
      .select("id")
      .single(),
    "student reacts to post",
  );
  expectError(
    await student.client
      .from("reactions")
      .insert({ post_id: post.id, user_id: student.id, type: "like" })
      .select("id")
      .single(),
    "duplicate student reaction is rejected",
  );
  expectNoError(
    await student.client
      .from("comments")
      .insert({ post_id: post.id, user_id: student.id, content: "Looks good." })
      .select("id")
      .single(),
    "student comments on post",
  );
  expectError(
    await teacher.client
      .from("comments")
      .insert({
        post_id: post.id,
        user_id: teacher.id,
        content: "Teacher comment should not pass RLS.",
      })
      .select("id")
      .single(),
    "teacher cannot create student comment",
  );

  const adminQuestion = expectNoError(
    await admin.client
      .from("questions")
      .insert({
        author_id: admin.id,
        content: `${runId} public question`,
        options: ["True", "False"],
        correct_answer: "True",
        source: "admin",
      })
      .select("id,content,options,correct_answer")
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
      .insert({
        set_id: publishedSet.id,
        question_id: adminQuestion.id,
        sort_order: 0,
        snapshot_content: adminQuestion.content,
        snapshot_options: adminQuestion.options,
        snapshot_correct_answer: adminQuestion.correct_answer,
      })
      .select("id,question_id,snapshot_content,snapshot_options,snapshot_correct_answer")
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
    (question) => ({
      author_id: teacher.id,
      content: question.snapshot_content,
      options: question.snapshot_options,
      correct_answer: question.snapshot_correct_answer,
      source: "teacher",
      original_id: question.question_id,
    }),
  );
  const imported = expectNoError(
    await teacher.client
      .from("questions")
      .insert(importedQuestions)
      .select("id,original_id")
      .single(),
    "teacher imports public set question",
  );
  assert(
    imported.original_id === adminQuestion.id,
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
        "social post reactions and comments",
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
