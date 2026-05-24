"use client";

import Link from "next/link";
import { useActionState } from "react";

import { updateProfile } from "@/features/auth/actions";
import {
  initialUpdateProfileState,
  type Profile,
} from "@/features/auth/types";

type EditProfileFormProps = {
  profile: Profile;
};

export function EditProfileForm({ profile }: EditProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialUpdateProfileState,
  );

  return (
    <form action={formAction} className="mt-8 max-w-2xl space-y-5">
      {state.message ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
              : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <label className="block">
        <span className="text-sm font-medium text-[#26352b]">Name</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={profile.name ?? ""}
          disabled={isPending}
          required
        />
        {state.fieldErrors?.name?.[0] ? (
          <span className="mt-2 block text-sm text-[#8a3a28]">
            {state.fieldErrors.name[0]}
          </span>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#26352b]">Bio</span>
        <textarea
          className="mt-2 min-h-36 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-4 py-3 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="bio"
          defaultValue={profile.bio ?? ""}
          disabled={isPending}
          maxLength={500}
        />
        <span className="mt-2 block text-sm text-[#607066]">
          Share a short introduction. 500 characters maximum.
        </span>
        {state.fieldErrors?.bio?.[0] ? (
          <span className="mt-2 block text-sm text-[#8a3a28]">
            {state.fieldErrors.bio[0]}
          </span>
        ) : null}
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save profile"}
        </button>
        <Link
          className="flex h-12 items-center justify-center rounded-md border border-[#cfd8d2] px-5 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
          href="/profile"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
