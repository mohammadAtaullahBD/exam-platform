import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const checks = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function mark(label) {
  checks.push(label);
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function walk(path) {
  const fullPath = join(root, path);

  try {
    statSync(fullPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  if (!statSync(fullPath).isDirectory()) {
    return [fullPath];
  }

  return readdirSync(fullPath, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === ".next") {
      return [];
    }

    return walk(join(path, entry.name));
  });
}

function codeFiles(...paths) {
  return paths
    .flatMap((path) => walk(path))
    .filter((path) => /\.(?:js|mjs|ts|tsx)$/.test(path));
}

function sqlFiles(...paths) {
  return paths
    .flatMap((path) => walk(path))
    .filter((path) => /\.sql$/i.test(path));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tableIsMentioned(source, table) {
  return new RegExp(`\\bpublic\\.${escapeRegex(table)}\\b`, "i").test(source);
}

function tableHasRls(source, table) {
  return new RegExp(
    `alter\\s+table\\s+(?:if\\s+exists\\s+)?public\\.${escapeRegex(
      table,
    )}\\s+enable\\s+row\\s+level\\s+security`,
    "i",
  ).test(source);
}

function tableHasIndex(source, table) {
  return new RegExp(
    `create\\s+(?:unique\\s+)?index\\s+(?:if\\s+not\\s+exists\\s+)?[^;]+\\s+on\\s+public\\.${escapeRegex(
      table,
    )}\\b`,
    "i",
  ).test(source);
}

function columnIsMentioned(source, table, column) {
  const columnPattern = new RegExp(`\\b${escapeRegex(column)}\\b`, "i");
  const createTablePattern = new RegExp(
    `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?public\\.${escapeRegex(
      table,
    )}\\s*\\(([\\s\\S]*?)\\n\\);`,
    "gi",
  );
  const alterTablePattern = new RegExp(
    `alter\\s+table\\s+public\\.${escapeRegex(table)}\\b[\\s\\S]*?;`,
    "gi",
  );

  for (const match of source.matchAll(createTablePattern)) {
    if (columnPattern.test(match[1])) {
      return true;
    }
  }

  for (const match of source.matchAll(alterTablePattern)) {
    if (columnPattern.test(match[0])) {
      return true;
    }
  }

  return false;
}

function columnHasIndex(source, table, column) {
  return new RegExp(
    `create\\s+(?:unique\\s+)?index\\s+(?:if\\s+not\\s+exists\\s+)?[^;]+\\s+on\\s+public\\.${escapeRegex(
      table,
    )}\\s*\\([^;)]*\\b${escapeRegex(column)}\\b`,
    "i",
  ).test(source);
}

const rolesSource = read("lib/roles.ts");
assert(
  /PUBLIC_SIGNUP_ROLES\s*=\s*\["student",\s*"teacher"\]/.test(rolesSource),
  "PUBLIC_SIGNUP_ROLES must allow only student and teacher.",
);
assert(
  !/PUBLIC_SIGNUP_ROLES\s*=\s*\[[^\]]*"admin"/.test(rolesSource),
  "PUBLIC_SIGNUP_ROLES must not include admin.",
);
mark("public signup excludes admin");

const hiddenRouteSurfaceFiles = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/(auth)/_components/auth-shell.tsx",
  "app/(auth)/_components/signup-form.tsx",
  "app/(auth)/signin/page.tsx",
  "app/(auth)/signup/page.tsx",
];

for (const file of hiddenRouteSurfaceFiles) {
  assert(
    !read(file).includes('href="/public-sets"'),
    `${file} must not link hidden super-user public sets.`,
  );
  assert(
    !read(file).includes('href="/admin/users"'),
    `${file} must not link hidden user management.`,
  );
}
mark("hidden super-user route is not linked from public/dashboard UI");

const allCodeFiles = codeFiles("app", "features", "lib", "components", "proxy.ts");
const clientFiles = allCodeFiles.filter((file) => {
  const source = readFileSync(file, "utf8").trimStart();
  return source.startsWith('"use client"') || source.startsWith("'use client'");
});

for (const file of clientFiles) {
  const source = readFileSync(file, "utf8");
  const display = relative(root, file);

  assert(
    !source.includes("SUPABASE_SERVICE_KEY"),
    `${display} must not reference SUPABASE_SERVICE_KEY.`,
  );
  assert(
    !source.includes("ADMIN_SETUP_TOKEN"),
    `${display} must not reference ADMIN_SETUP_TOKEN.`,
  );
  assert(
    !source.includes("createAdminClient"),
    `${display} must not import or use the service-role admin client.`,
  );
}
mark("client components do not reference service secrets or admin client");

const authzFiles = allCodeFiles.filter((file) => {
  const normalized = relative(root, file).replaceAll("\\", "/");
  return (
    normalized.startsWith("app/") ||
    normalized.startsWith("features/") ||
    normalized.startsWith("lib/")
  );
});

for (const file of authzFiles) {
  const source = stripComments(readFileSync(file, "utf8"));
  const display = relative(root, file);

  assert(
    !/user_metadata\??\s*\.\s*role/.test(source),
    `${display} must not authorize from user_metadata.role.`,
  );
  assert(
    !/raw_user_meta_data[\s\S]{0,80}role/.test(source),
    `${display} must not authorize from raw_user_meta_data role.`,
  );
}
mark("authorization avoids user-editable role metadata");

assert(
  authzFiles.some((file) =>
    readFileSync(file, "utf8").includes("app_metadata?.role"),
  ),
  "Expected app_metadata.role checks in authorization code.",
);
mark("authorization uses trusted app_metadata role checks");

const migrationSource = sqlFiles("supabase/migrations")
  .map((file) => readFileSync(file, "utf8"))
  .join("\n\n");

const rlsProtectedPublicTables = [
  "questions",
  "exam_questions",
  "submission_answers",
  "public_exam_set_questions",
  "public_exam_attempt_answers",
  "question_sets",
];

for (const table of rlsProtectedPublicTables) {
  if (!tableIsMentioned(migrationSource, table)) {
    continue;
  }

  assert(
    tableHasRls(migrationSource, table),
    `public.${table} must enable row level security in migrations.`,
  );
}
mark("question and answer public tables enable RLS when present");

const indexedPublicTables = ["question_sets"];

for (const table of indexedPublicTables) {
  if (!tableIsMentioned(migrationSource, table)) {
    continue;
  }

  assert(
    tableHasIndex(migrationSource, table),
    `public.${table} must define at least one supporting index.`,
  );
}
mark("new question-set public tables define supporting indexes when present");

const expectedFkIndexes = [
  ["question_sets", "owner_id"],
  ["question_sets", "teacher_id"],
  ["question_sets", "author_id"],
  ["questions", "question_set_id"],
  ["exam_questions", "question_set_id"],
  ["submission_answers", "question_id"],
  ["submission_answers", "exam_question_id"],
  ["public_exam_set_questions", "question_id"],
  ["public_exam_attempt_answers", "question_id"],
  ["public_exam_attempt_answers", "set_question_id"],
];

for (const [table, column] of expectedFkIndexes) {
  if (!columnIsMentioned(migrationSource, table, column)) {
    continue;
  }

  assert(
    columnHasIndex(migrationSource, table, column),
    `public.${table}.${column} must have a supporting index.`,
  );
}
mark("question-set and answer FK columns are indexed when present");

const typedQuestionMigrationIsPresent =
  /\bquestion_type\b/i.test(migrationSource) ||
  /\bshort_answer\b/i.test(migrationSource) ||
  /\blinear_scale\b/i.test(migrationSource);

if (typedQuestionMigrationIsPresent) {
  for (const type of [
    "short_answer",
    "paragraph",
    "multiple_choice",
    "checkboxes",
    "dropdown",
    "linear_scale",
    "rating",
  ]) {
    assert(
      migrationSource.includes(type),
      `Typed questions migration must include ${type}.`,
    );
  }
}
mark("typed question migrations cover the Google-Forms-like type set when present");

console.log(
  JSON.stringify(
    {
      status: "ok",
      checks,
    },
    null,
    2,
  ),
);
