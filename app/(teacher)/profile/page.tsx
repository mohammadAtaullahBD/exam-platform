import { redirect } from "next/navigation";

import { StudentProfile } from "@/features/auth/components/student-profile";
import { TeacherProfile } from "@/features/auth/components/teacher-profile";
import { getCurrentProfile } from "@/features/auth/profile-queries";

export default async function ProfilePage() {
  const profile = await getCurrentProfile("/profile");

  if (profile.role === "teacher") {
    return <TeacherProfile profile={profile} isOwnProfile={true} />;
  }

  if (profile.role === "student") {
    return <StudentProfile profile={profile} />;
  }

  redirect("/dashboard");
}
