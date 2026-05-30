import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const requiredRedirectUrls = [
  "https://exam.ataullah.dev/auth/callback",
  "http://localhost:3000/auth/callback",
];

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

const admin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function deleteUserByEmail(email) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );

    if (user) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    }

    if (data.users.length < 1000) {
      break;
    }
  }

  return false;
}

const verified = [];
const cleanup = [];

for (const redirectUrl of requiredRedirectUrls) {
  const email = `codex-redirect-${Date.now()}-${randomUUID().slice(
    0,
    8,
  )}@example.test`;
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: `Redirect-${randomUUID()}-aA1!`,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: "Codex Redirect Smoke",
        },
      },
    });

    if (error) {
      throw new Error(`${redirectUrl} was rejected: ${error.message}`);
    }

    if (!data.user) {
      throw new Error(`${redirectUrl} did not create a temporary Auth user.`);
    }

    verified.push(redirectUrl);
  } finally {
    cleanup.push({
      email,
      deleted: await deleteUserByEmail(email),
    });
  }
}

console.log(
  JSON.stringify(
    {
      status: "ok",
      verifiedRedirectUrls: verified,
      cleanup,
    },
    null,
    2,
  ),
);
