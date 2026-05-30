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
