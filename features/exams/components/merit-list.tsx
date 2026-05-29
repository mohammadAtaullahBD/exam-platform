import type { MeritList } from "@/features/exams/types";

type MeritListViewProps = {
  meritList: MeritList;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MeritListView({ meritList }: MeritListViewProps) {
  if (meritList.exam.state !== "closed") {
    return (
      <section className="mt-8 rounded-lg border border-[#e5d6b8] bg-[#fffaf0] p-6 text-[#6c5620]">
        <h2 className="text-xl font-semibold">Merit list is locked</h2>
        <p className="mt-3 text-sm leading-6">
          Rankings appear after the exam closes at{" "}
          {formatDateTime(meritList.exam.endsAt)}.
        </p>
      </section>
    );
  }

  if (!meritList.entries.length) {
    return (
      <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-6">
        <h2 className="text-xl font-semibold">No submissions yet</h2>
        <p className="mt-3 text-sm leading-6 text-[#607066]">
          The exam has closed, but no student submissions are available.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 overflow-hidden rounded-lg border border-[#d8dfda] bg-white">
      <div className="border-b border-[#d8dfda] p-5">
        <h2 className="text-xl font-semibold">Merit list</h2>
        <p className="mt-2 text-sm text-[#607066]">
          Ranked by score, then earliest submission.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <thead className="bg-[#f6f8f5] text-[#607066]">
            <tr>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {meritList.entries.map((entry) => (
              <tr className="border-t border-[#e7ece8]" key={entry.submissionId}>
                <td className="px-4 py-4 font-semibold text-[#17211b]">
                  {entry.rank}
                </td>
                <td className="px-4 py-4 text-[#26352b]">
                  {entry.studentName}
                </td>
                <td className="px-4 py-4 font-semibold text-[#26352b]">
                  {entry.score}/{entry.totalQuestions}
                </td>
                <td className="px-4 py-4 text-[#607066]">
                  {formatDateTime(entry.submittedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

