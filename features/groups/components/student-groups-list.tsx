import type { StudentGroup } from "@/features/groups/types";

type StudentGroupsListProps = {
  groups: StudentGroup[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function StudentGroupsList({ groups }: StudentGroupsListProps) {
  if (!groups.length) {
    return (
      <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-6">
        <h2 className="text-xl font-semibold">My Groups</h2>
        <p className="mt-3 text-sm leading-6 text-[#607066]">
          You have not joined any groups yet. Use an invite link from your
          teacher to join one.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">My Groups</h2>
      <div className="mt-4 grid gap-4">
        {groups.map((group) => (
          <article
            className="rounded-lg border border-[#d8dfda] bg-white p-5"
            key={group.id}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">{group.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#607066]">
                  {group.description || "No description yet."}
                </p>
              </div>
              <p className="text-sm font-medium text-[#607066]">
                Joined {formatDate(group.joinedAt)}
              </p>
            </div>
            <p className="mt-4 text-sm font-medium text-[#26352b]">
              Teacher: {group.teacherName}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
