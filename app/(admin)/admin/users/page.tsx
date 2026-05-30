import { AdminUserTable } from "@/features/admin-users/components/admin-user-table";
import { getManagedUsers } from "@/features/admin-users/queries";

export default async function AdminUsersPage() {
  const users = await getManagedUsers("/admin/users");

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-[#d8dfda] pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
            Private user management
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Manage user roles</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
            Review Supabase Auth users and update trusted app roles. Current
            sessions may need sign-out and sign-in before role claims refresh.
          </p>
        </header>

        <div className="mt-8">
          <AdminUserTable users={users} />
        </div>
      </div>
    </main>
  );
}
