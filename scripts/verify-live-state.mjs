import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

function parseEnvFile(path) {
  const env = {};

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);

    if (!match) {
      continue;
    }

    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }

  return env;
}

async function listAuthUsers(supabase) {
  const users = [];

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < 1000) {
      break;
    }
  }

  return users;
}

async function listProfiles(supabase) {
  const rows = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("users")
      .select("id,email,role")
      .range(from, from + 999);

    if (error) {
      throw error;
    }

    rows.push(...(data ?? []));

    if (!data || data.length < 1000) {
      break;
    }
  }

  return rows;
}

async function countRowsByUserIds(supabase, table, column, ids, selectColumn) {
  if (!ids.length) {
    return 0;
  }

  const { count, error } = await supabase
    .from(table)
    .select(selectColumn, { count: "exact", head: true })
    .in(column, ids);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

const env = parseEnvFile(".env.local");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const [authUsers, profiles] = await Promise.all([
  listAuthUsers(supabase),
  listProfiles(supabase),
]);
const authIds = new Set(authUsers.map((user) => user.id));
const profileIds = new Set(profiles.map((profile) => profile.id));
const orphanProfiles = profiles.filter((profile) => !authIds.has(profile.id));
const orphanProfileIds = orphanProfiles.map((profile) => profile.id);
const smokeOrphanProfileCount = orphanProfiles.filter((profile) =>
  profile.email?.startsWith("codex-smoke-"),
).length;
const orphanDependencyCounts = {
  comments: await countRowsByUserIds(
    supabase,
    "comments",
    "user_id",
    orphanProfileIds,
    "id",
  ),
  groupMembers: await countRowsByUserIds(
    supabase,
    "group_members",
    "student_id",
    orphanProfileIds,
    "group_id",
  ),
  groups: await countRowsByUserIds(
    supabase,
    "groups",
    "teacher_id",
    orphanProfileIds,
    "id",
  ),
  posts: await countRowsByUserIds(
    supabase,
    "posts",
    "teacher_id",
    orphanProfileIds,
    "id",
  ),
  publicExamAttempts: await countRowsByUserIds(
    supabase,
    "public_exam_attempts",
    "student_id",
    orphanProfileIds,
    "id",
  ),
  publicExamSets: await countRowsByUserIds(
    supabase,
    "public_exam_sets",
    "admin_id",
    orphanProfileIds,
    "id",
  ),
  questions: await countRowsByUserIds(
    supabase,
    "questions",
    "author_id",
    orphanProfileIds,
    "id",
  ),
  reactions: await countRowsByUserIds(
    supabase,
    "reactions",
    "user_id",
    orphanProfileIds,
    "id",
  ),
  submissions: await countRowsByUserIds(
    supabase,
    "submissions",
    "student_id",
    orphanProfileIds,
    "id",
  ),
};
const adminAuthCount = authUsers.filter(
  (user) => user.app_metadata?.role === "admin",
).length;
const profileRoles = profiles.reduce((counts, profile) => {
  counts[profile.role] = (counts[profile.role] ?? 0) + 1;
  return counts;
}, {});
const orphanProfileRoles = orphanProfiles.reduce((counts, profile) => {
  counts[profile.role] = (counts[profile.role] ?? 0) + 1;
  return counts;
}, {});

console.log(
  JSON.stringify(
    {
      authUserCount: authUsers.length,
      profileUserCount: profiles.length,
      profileRoles,
      firstAdminExists: adminAuthCount > 0,
      adminAuthCount,
      orphanProfileCount: orphanProfiles.length,
      orphanProfileRoles,
      smokeOrphanProfileCount,
      orphanDependencyCounts,
      orphanProfilesHaveDependencies: Object.values(orphanDependencyCounts).some(
        (count) => count > 0,
      ),
      authUsersMissingProfileCount: authUsers.filter(
        (user) => !profileIds.has(user.id),
      ).length,
      adminSetupTokenConfigured: Boolean(env.ADMIN_SETUP_TOKEN),
      legacyDuplicateEnvVarsPresent: [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "NEXTAUTH_SECRET",
        "NEXTAUTH_URL",
      ].filter((key) => Boolean(env[key])),
    },
    null,
    2,
  ),
);
