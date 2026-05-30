const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/groups",
  "/questions",
  "/exams",
  "/posts",
  "/student/groups",
  "/student/exams",
  "/student/exams/00000000-0000-4000-8000-000000000001",
  "/student/exams/00000000-0000-4000-8000-000000000001/merit",
  "/student/progress",
  "/student/practice",
  "/student/feed",
  "/student/public-exams",
  "/exams/00000000-0000-4000-8000-000000000001/merit",
  "/join/0123456789abcdef0123456789abcdef",
  "/public-sets",
  "/admin/users",
];

function urlFor(path) {
  return new URL(path, baseUrl).toString();
}

function expectedSignInLocation(path) {
  return `/signin?callbackUrl=${encodeURIComponent(path)}`;
}

async function assertPublicPage(path) {
  const response = await fetch(urlFor(path), { redirect: "manual" });

  if (response.status !== 200) {
    throw new Error(`${path} expected 200, received ${response.status}`);
  }
}

async function assertEndpointStatus(path, init, expectedStatuses) {
  const response = await fetch(urlFor(path), {
    redirect: "manual",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${path} expected one of ${expectedStatuses.join(", ")}, received ${
        response.status
      }`,
    );
  }
}

async function assertProtectedRedirect(path) {
  const response = await fetch(urlFor(path), { redirect: "manual" });
  const location = response.headers.get("location") ?? "";
  const expected = expectedSignInLocation(path);

  if (![307, 308].includes(response.status) || !location.includes(expected)) {
    throw new Error(
      `${path} expected redirect to ${expected}, received ${response.status} ${location}`,
    );
  }
}

async function assertInvalidSignupRejected() {
  const response = await fetch(urlFor("/api/auth/signup"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Smoke User",
      email: "smoke@example.test",
      password: "password123",
      role: "admin",
    }),
  });

  if (response.status !== 400) {
    throw new Error(`invalid admin signup expected 400, received ${response.status}`);
  }
}

await assertPublicPage("/");
await assertPublicPage("/signin");
await assertPublicPage("/signup");
await assertPublicPage("/auth/check-email");
await assertPublicPage("/auth/error");
await assertEndpointStatus("/api/health", { method: "GET" }, [200, 503]);
await assertInvalidSignupRejected();
await assertEndpointStatus("/api/auth/sync-profile", { method: "POST" }, [401]);
await assertEndpointStatus(
  "/api/admin/users/00000000-0000-4000-8000-000000000001/role",
  {
    method: "PATCH",
    body: JSON.stringify({ role: "teacher" }),
  },
  [401],
);
await assertEndpointStatus(
  "/api/admin/bootstrap",
  {
    method: "POST",
    body: JSON.stringify({ email: "smoke@example.test" }),
  },
  [401, 503],
);

for (const route of protectedRoutes) {
  await assertProtectedRedirect(route);
}

console.log(
  `Smoke routes passed for ${protectedRoutes.length} protected routes at ${baseUrl}`,
);
