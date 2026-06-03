"use client";

import {
  Copy,
  MailPlus,
  Pencil,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  addGroupMemberByEmail,
  deleteGroupAndRedirect,
  removeGroupMember,
  updateGroup,
  updateGroupMemberIdentity,
} from "@/features/groups/actions";
import {
  initialGroupActionState,
  type Group,
  type GroupActionState,
  type GroupMember,
} from "@/features/groups/types";

type BatchManagementProps = {
  batch: Group;
  inviteUrl: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function BatchManagement({ batch, inviteUrl }: BatchManagementProps) {
  const [copied, setCopied] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6">
      <section className="rounded-lg border border-[#d8dfda] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#d8dfda] p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Batch details</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">
              Review the batch summary and use the action icons when changes are
              needed.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              aria-label="Edit batch details"
              className="inline-flex size-10 items-center justify-center rounded-md border border-[#cfd8d2] text-[#1f3528] transition hover:bg-[#eef5f0]"
              onClick={() => setIsEditOpen(true)}
              title="Edit batch details"
              type="button"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            <button
              aria-label="Delete batch"
              className="inline-flex size-10 items-center justify-center rounded-md border border-[#d9b7ad] text-[#7a2f1f] transition hover:bg-[#fff2ef]"
              onClick={() => setIsDeleteOpen(true)}
              title="Delete batch"
              type="button"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Name
            </p>
            <p className="mt-2 break-words text-lg font-semibold text-[#17211b]">
              {batch.name}
            </p>
          </div>
          <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Students
            </p>
            <p className="mt-2 text-lg font-semibold text-[#17211b]">
              {batch.memberCount}{" "}
              {batch.memberCount === 1 ? "student" : "students"}
            </p>
          </div>
          <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Description
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-[#26352b]">
              {batch.description || "No description yet."}
            </p>
          </div>
        </div>

        <div className="border-t border-[#d8dfda] p-5">
          <label className="block">
            <span className="text-sm font-medium text-[#26352b]">
              Student invite link
            </span>
            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="h-11 w-full rounded-md border border-[#cfc7ba] bg-[#f9fbf8] px-3 text-sm text-[#26352b]"
                value={inviteUrl}
                readOnly
              />
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
                type="button"
                onClick={copyInviteLink}
              >
                <Copy className="size-4" aria-hidden="true" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-[#d8dfda] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#d8dfda] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Students</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">
              Student records are shown in rows so roll numbers and identity
              labels stay easy to scan.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b]"
            type="button"
            onClick={() => setIsAddStudentOpen(true)}
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Add student
          </button>
        </div>

        <div className="p-5">
          {batch.members.length ? (
            <StudentGrid batchId={batch.id} members={batch.members} />
          ) : (
            <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] px-4 py-3 text-sm leading-6 text-[#607066]">
              This batch is empty. Add a student by email now, or share the
              invite link so students can join later.
            </div>
          )}
        </div>
      </section>

      {isEditOpen ? (
        <EditBatchModal batch={batch} onClose={() => setIsEditOpen(false)} />
      ) : null}
      {isDeleteOpen ? (
        <DeleteBatchModal
          batch={batch}
          onClose={() => setIsDeleteOpen(false)}
        />
      ) : null}
      {isAddStudentOpen ? (
        <AddStudentModal
          batchId={batch.id}
          onClose={() => setIsAddStudentOpen(false)}
        />
      ) : null}
    </div>
  );
}

function StudentGrid({
  batchId,
  members,
}: {
  batchId: string;
  members: GroupMember[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-[#d8dfda]">
      <div className="hidden grid-cols-[5rem_minmax(10rem,1fr)_minmax(12rem,1.2fr)_minmax(10rem,1fr)_8rem_6rem] gap-3 border-b border-[#d8dfda] bg-[#f6f8f5] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f765f] lg:grid">
        <span>Roll</span>
        <span>Student</span>
        <span>Email</span>
        <span>Identity</span>
        <span>Joined</span>
        <span className="text-right">Actions</span>
      </div>
      <div className="grid divide-y divide-[#d8dfda]">
        {members.map((member) => (
          <StudentGridRow
            batchId={batchId}
            key={member.studentId}
            member={member}
          />
        ))}
      </div>
    </div>
  );
}

function StudentGridRow({
  batchId,
  member,
}: {
  batchId: string;
  member: GroupMember;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <div className="grid gap-3 bg-white px-4 py-4 text-sm lg:grid-cols-[5rem_minmax(10rem,1fr)_minmax(12rem,1.2fr)_minmax(10rem,1fr)_8rem_6rem] lg:items-center">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607066] lg:hidden">
          Roll
        </span>
        <p className="font-semibold text-[#17211b]">{member.rollNumber}</p>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607066] lg:hidden">
          Student
        </span>
        <p className="break-words font-semibold text-[#26352b]">
          {member.studentName}
        </p>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607066] lg:hidden">
          Email
        </span>
        <p className="break-words text-[#607066]">
          {member.studentEmail ?? "No email"}
        </p>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607066] lg:hidden">
          Identity
        </span>
        <p className="break-words text-[#26352b]">
          {member.studentIdentity || "Default profile name"}
        </p>
      </div>
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607066] lg:hidden">
          Joined
        </span>
        <p className="text-[#607066]">{formatDate(member.joinedAt)}</p>
      </div>
      <div className="flex gap-2 lg:justify-end">
        <button
          aria-label={`Edit ${member.studentName}`}
          className="inline-flex size-9 items-center justify-center rounded-md border border-[#cfd8d2] text-[#1f3528] transition hover:bg-[#eef5f0]"
          onClick={() => setIsEditOpen(true)}
          title="Edit student"
          type="button"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
        <button
          aria-label={`Remove ${member.studentName}`}
          className="inline-flex size-9 items-center justify-center rounded-md border border-[#d9b7ad] text-[#7a2f1f] transition hover:bg-[#fff2ef]"
          onClick={() => setIsDeleteOpen(true)}
          title="Remove student"
          type="button"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {isEditOpen ? (
        <EditStudentModal
          batchId={batchId}
          member={member}
          onClose={() => setIsEditOpen(false)}
        />
      ) : null}
      {isDeleteOpen ? (
        <RemoveStudentModal
          batchId={batchId}
          member={member}
          onClose={() => setIsDeleteOpen(false)}
        />
      ) : null}
    </div>
  );
}

function EditBatchModal({
  batch,
  onClose,
}: {
  batch: Group;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(
    updateGroup.bind(null, batch.id),
    initialGroupActionState,
  );

  useRefreshOnSuccess(state, onClose);

  return (
    <Modal title="Edit batch" onClose={onClose}>
      <form action={action} className="grid gap-4">
        {state.message ? (
          <StatusMessage message={state.message} status={state.status} />
        ) : null}
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Batch name</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="name"
            type="text"
            defaultValue={batch.name}
            disabled={isPending}
            required
          />
          {state.fieldErrors?.name?.[0] ? (
            <FieldError message={state.fieldErrors.name[0]} />
          ) : null}
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">
            Description
          </span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="description"
            defaultValue={batch.description ?? ""}
            maxLength={500}
            disabled={isPending}
          />
          {state.fieldErrors?.description?.[0] ? (
            <FieldError message={state.fieldErrors.description[0]} />
          ) : null}
        </label>
        <div className="flex justify-end gap-2">
          <CancelButton disabled={isPending} onClick={onClose} />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
            onClick={() => router.prefetch("/batches")}
          >
            <Save className="size-4" aria-hidden="true" />
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteBatchModal({
  batch,
  onClose,
}: {
  batch: Group;
  onClose: () => void;
}) {
  const [state, action, isPending] = useActionState(
    deleteGroupAndRedirect.bind(null, batch.id),
    initialGroupActionState,
  );

  return (
    <Modal title="Delete batch?" onClose={onClose}>
      <form action={action} className="grid gap-4">
        <p className="text-sm leading-6 text-[#607066]">
          This will delete <strong className="text-[#17211b]">{batch.name}</strong>,
          remove its memberships, and remove scheduled exams for this batch.
          This action cannot be undone.
        </p>
        {state.status === "error" && state.message ? (
          <StatusMessage message={state.message} status={state.status} />
        ) : null}
        <div className="flex justify-end gap-2">
          <CancelButton disabled={isPending} onClick={onClose} />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#7a2f1f] px-4 text-sm font-semibold text-white transition hover:bg-[#642718] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddStudentModal({
  batchId,
  onClose,
}: {
  batchId: string;
  onClose: () => void;
}) {
  const [state, action, isPending] = useActionState(
    addGroupMemberByEmail.bind(null, batchId),
    initialGroupActionState,
  );

  useRefreshOnSuccess(state, onClose);

  return (
    <Modal title="Add student" onClose={onClose}>
      <form action={action} className="grid gap-4">
        {state.message ? (
          <StatusMessage message={state.message} status={state.status} />
        ) : null}
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">
            Student email
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="email"
            type="email"
            placeholder="student@example.com"
            disabled={isPending}
            required
          />
          {state.fieldErrors?.email?.[0] ? (
            <FieldError message={state.fieldErrors.email[0]} />
          ) : null}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-[#26352b]">Roll</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
              name="rollNumber"
              type="number"
              min={1}
              max={99999}
              placeholder="Auto"
              disabled={isPending}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#26352b]">
              Identity
            </span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
              name="studentIdentity"
              type="text"
              maxLength={80}
              placeholder="Optional"
              disabled={isPending}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <CancelButton disabled={isPending} onClick={onClose} />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            <MailPlus className="size-4" aria-hidden="true" />
            {isPending ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditStudentModal({
  batchId,
  member,
  onClose,
}: {
  batchId: string;
  member: GroupMember;
  onClose: () => void;
}) {
  const [state, action, isPending] = useActionState(
    updateGroupMemberIdentity.bind(null, batchId),
    initialGroupActionState,
  );

  useRefreshOnSuccess(state, onClose);

  return (
    <Modal title="Edit student" onClose={onClose}>
      <form action={action} className="grid gap-4">
        {state.message ? (
          <StatusMessage message={state.message} status={state.status} />
        ) : null}
        <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3">
          <p className="break-words text-sm font-semibold text-[#26352b]">
            {member.studentName}
          </p>
          {member.studentEmail ? (
            <p className="mt-1 break-words text-xs text-[#607066]">
              {member.studentEmail}
            </p>
          ) : null}
        </div>
        <input name="studentId" type="hidden" value={member.studentId} />
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Roll</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="rollNumber"
            type="number"
            min={1}
            max={99999}
            defaultValue={member.rollNumber}
            disabled={isPending}
            required
          />
          {state.fieldErrors?.rollNumber?.[0] ? (
            <FieldError message={state.fieldErrors.rollNumber[0]} />
          ) : null}
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Identity</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="studentIdentity"
            type="text"
            maxLength={80}
            defaultValue={member.studentIdentity ?? ""}
            disabled={isPending}
          />
          {state.fieldErrors?.studentIdentity?.[0] ? (
            <FieldError message={state.fieldErrors.studentIdentity[0]} />
          ) : null}
        </label>
        <div className="flex justify-end gap-2">
          <CancelButton disabled={isPending} onClick={onClose} />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            <Save className="size-4" aria-hidden="true" />
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RemoveStudentModal({
  batchId,
  member,
  onClose,
}: {
  batchId: string;
  member: GroupMember;
  onClose: () => void;
}) {
  const [state, action, isPending] = useActionState(
    removeGroupMember.bind(null, batchId, member.studentId),
    initialGroupActionState,
  );

  useRefreshOnSuccess(state, onClose);

  return (
    <Modal title="Remove student?" onClose={onClose}>
      <form action={action} className="grid gap-4">
        <p className="text-sm leading-6 text-[#607066]">
          Remove <strong className="text-[#17211b]">{member.studentName}</strong>{" "}
          from this batch? Their profile will not be deleted.
        </p>
        {state.message ? (
          <StatusMessage message={state.message} status={state.status} />
        ) : null}
        <div className="flex justify-end gap-2">
          <CancelButton disabled={isPending} onClick={onClose} />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#7a2f1f] px-4 text-sm font-semibold text-white transition hover:bg-[#642718] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {isPending ? "Removing..." : "Delete"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6"
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[#d8dfda] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#d8dfda] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#17211b]">{title}</h2>
          <button
            aria-label="Close"
            className="inline-flex size-9 items-center justify-center rounded-md border border-[#cfd8d2] text-[#1f3528] transition hover:bg-[#eef5f0]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function CancelButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      Cancel
    </button>
  );
}

function FieldError({ message }: { message: string }) {
  return <span className="mt-2 block text-sm text-[#8a3a28]">{message}</span>;
}

function StatusMessage({
  message,
  status,
}: {
  message: string;
  status: "idle" | "success" | "error";
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${
        status === "success"
          ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
          : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
      }`}
    >
      {message}
    </div>
  );
}

function useRefreshOnSuccess(state: GroupActionState, onClose: () => void) {
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    onClose();
    router.refresh();
  }, [onClose, router, state.status]);
}
