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
  "/student/progress",
  "/student/practice",
  "/student/feed",
  "/student/public-exams",
  "/public-sets",
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
await assertInvalidSignupRejected();

for (const route of protectedRoutes) {
  await assertProtectedRedirect(route);
}

console.log(
  `Smoke routes passed for ${protectedRoutes.length} protected routes at ${baseUrl}`,
);
