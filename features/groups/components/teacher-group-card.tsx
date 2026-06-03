"use client";

import { useActionState } from "react";

import {
  deleteGroup,
  updateGroup,
  updateGroupMemberIdentity,
} from "@/features/groups/actions";
import {
  initialGroupActionState,
  type Group,
  type GroupMember,
} from "@/features/groups/types";

type TeacherGroupCardProps = {
  group: Group;
  inviteUrl: string;
};

export function TeacherGroupCard({ group, inviteUrl }: TeacherGroupCardProps) {
  const [updateState, updateAction, isUpdating] = useActionState(
    updateGroup.bind(null, group.id),
    initialGroupActionState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteGroup.bind(null, group.id),
    initialGroupActionState,
  );

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{group.name}</h2>
          <p className="mt-2 text-sm leading-6 text-[#607066]">
            {group.description || "No description yet."}
          </p>
        </div>
        <div className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 text-sm font-semibold text-[#1f3528]">
          {group.memberCount} {group.memberCount === 1 ? "student" : "students"}
        </div>
      </div>

      <div className="mt-5">
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">
            Batch invite link
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-[#f9fbf8] px-3 text-sm text-[#26352b]"
            value={inviteUrl}
            readOnly
          />
        </label>
      </div>

      <form action={updateAction} className="mt-6 grid gap-4">
        {updateState.message ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              updateState.status === "success"
                ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
            }`}
          >
            {updateState.message}
          </div>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Name</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="name"
            type="text"
            defaultValue={group.name}
            disabled={isUpdating || isDeleting}
            required
          />
          {updateState.fieldErrors?.name?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {updateState.fieldErrors.name[0]}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">
            Description
          </span>
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="description"
            defaultValue={group.description ?? ""}
            maxLength={500}
            disabled={isUpdating || isDeleting}
          />
          {updateState.fieldErrors?.description?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {updateState.fieldErrors.description[0]}
            </span>
          ) : null}
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="h-11 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isUpdating || isDeleting}
          >
            {isUpdating ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      <form action={deleteAction} className="mt-3">
        {deleteState.status === "error" && deleteState.message ? (
          <div className="mb-3 rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
            {deleteState.message}
          </div>
        ) : null}
        <button
          className="h-11 rounded-md border border-[#d9b7ad] px-4 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isUpdating || isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete batch"}
        </button>
      </form>

      <section className="mt-6 border-t border-[#d8dfda] pt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
          Students
        </h3>
        {group.members.length ? (
          <div className="mt-3 grid gap-3">
            {group.members.map((member) => (
              <BatchMemberForm
                groupId={group.id}
                key={member.studentId}
                member={member}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#607066]">
            Students appear here after they join from the invite link.
          </p>
        )}
      </section>
    </article>
  );
}

function BatchMemberForm({
  groupId,
  member,
}: {
  groupId: string;
  member: GroupMember;
}) {
  const [state, action, isPending] = useActionState(
    updateGroupMemberIdentity.bind(null, groupId),
    initialGroupActionState,
  );

  return (
    <form
      action={action}
      className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3"
    >
      <input name="studentId" type="hidden" value={member.studentId} />
      <div className="grid gap-3 lg:grid-cols-[7rem_minmax(0,1fr)_auto] lg:items-end">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607066]">
            Roll
          </span>
          <input
            className="mt-1 h-10 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="rollNumber"
            type="number"
            min={1}
            max={99999}
            defaultValue={member.rollNumber}
            disabled={isPending}
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607066]">
            Identity
          </span>
          <input
            className="mt-1 h-10 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="studentIdentity"
            type="text"
            maxLength={80}
            placeholder={member.studentName}
            defaultValue={member.studentIdentity ?? ""}
            disabled={isPending}
          />
          {member.studentEmail ? (
            <span className="mt-1 block truncate text-xs text-[#607066]">
              {member.studentEmail}
            </span>
          ) : null}
        </label>
        <button
          className="h-10 rounded-md bg-[#17211b] px-3 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
      {state.message ? (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            state.status === "success"
              ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
              : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
          }`}
        >
          {state.message}
        </div>
      ) : null}
    </form>
  );
}
