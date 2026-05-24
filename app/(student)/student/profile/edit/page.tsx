import { redirect } from "next/navigation";

import { EditProfileForm } from "@/features/auth/components/edit-profile-form";
import { getCurrentProfile } from "@/features/auth/profile-queries";

export default async function StudentEditProfilePage() {
  const profile = await getCurrentProfile("/student/profile/edit");

  if (profile.role !== "student") {
    redirect("/profile/edit");
  }

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-[#d8dfda] pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
            Profile settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Edit profile</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
            Update the name and bio shown on your profile.
          </p>
        </header>

        <EditProfileForm profile={profile} />
      </div>
    </main>
  );
}
