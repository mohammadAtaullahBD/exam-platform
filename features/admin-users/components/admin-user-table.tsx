import { USER_ROLES } from "@/lib/roles";

import { updateManagedUserRole } from "../actions";
import type { ManagedUser } from "../types";

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminUserTable({ users }: { users: ManagedUser[] }) {
  if (!users.length) {
    return (
      <section className="rounded-lg border border-[#d8dfda] bg-white p-6">
        <h2 className="text-xl font-semibold">No users found</h2>
        <p className="mt-2 text-sm leading-6 text-[#607066]">
          Supabase Auth did not return any users for this project.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#d8dfda] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#e3e8e4] text-sm">
          <thead className="bg-[#f6f8f5] text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#607066]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Profile</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Last sign-in</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf1ee]">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-4 align-top">
                  <p className="font-semibold text-[#17211b]">
                    {user.name ?? "Unnamed user"}
                  </p>
                  <p className="mt-1 max-w-[18rem] truncate font-mono text-xs text-[#607066]">
                    {user.id}
                  </p>
                  {user.isCurrentUser ? (
                    <p className="mt-2 inline-flex rounded-sm bg-[#e6f0ea] px-2 py-1 text-xs font-semibold text-[#315f3d]">
                      Current user
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4 align-top">
                  <form action={updateManagedUserRole.bind(null, user.id)}>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Role for ${user.email}`}
                        className="h-10 rounded-md border border-[#cfd8d2] bg-white px-3 text-sm font-medium text-[#1f3528]"
                        defaultValue={user.authRole}
                        disabled={user.isCurrentUser}
                        name="role"
                      >
                        {USER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        className="h-10 rounded-md bg-[#17211b] px-3 text-xs font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:bg-[#9ba69f]"
                        disabled={user.isCurrentUser}
                        type="submit"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="capitalize text-[#17211b]">
                    {user.profileRole ?? "missing"}
                  </p>
                  {user.profileRole && user.profileRole !== user.authRole ? (
                    <p className="mt-1 text-xs font-semibold text-[#8a5b15]">
                      Profile role differs
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="max-w-[16rem] break-words text-[#17211b]">
                    {user.email || "No email"}
                  </p>
                  <p className="mt-1 text-xs text-[#607066]">
                    Confirmed {formatDate(user.emailConfirmedAt)}
                  </p>
                </td>
                <td className="px-4 py-4 align-top text-[#607066]">
                  {formatDate(user.lastSignInAt)}
                </td>
                <td className="px-4 py-4 align-top text-[#607066]">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
