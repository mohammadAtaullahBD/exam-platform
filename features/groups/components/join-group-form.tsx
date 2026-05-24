"use client";

import Link from "next/link";
import { useActionState } from "react";

import { joinGroupByInvite } from "@/features/groups/actions";
import {
  initialGroupActionState,
  type GroupInvite,
} from "@/features/groups/types";

type JoinGroupFormProps = {
  invite: GroupInvite;
};

export function JoinGroupForm({ invite }: JoinGroupFormProps) {
  const [state, formAction, isPending] = useActionState(
    joinGroupByInvite,
    initialGroupActionState,
  );

  return (
    <form
      action={formAction}
      className="mt-8 max-w-2xl rounded-lg border border-[#d8dfda] bg-white p-6"
    >
      <input name="token" type="hidden" value={invite.token} />
      <h2 className="text-xl font-semibold">{invite.groupName}</h2>
      <p className="mt-2 text-sm leading-6 text-[#607066]">
        {invite.description || "This teacher has invited you to join a group."}
      </p>
      <p className="mt-4 text-sm font-medium text-[#26352b]">
        Teacher: {invite.teacherName}
      </p>

      {state.message ? (
        <div
          className={`mt-5 rounded-md border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
              : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          className="h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Joining..." : "Join group"}
        </button>
        <Link
          className="flex h-12 items-center justify-center rounded-md border border-[#cfd8d2] px-5 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
          href="/student/groups"
        >
          My groups
        </Link>
      </div>
    </form>
  );
}
