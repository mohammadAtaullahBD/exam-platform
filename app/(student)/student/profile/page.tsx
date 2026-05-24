import { redirect } from "next/navigation";

import { StudentProfile } from "@/features/auth/components/student-profile";
import { getCurrentProfile } from "@/features/auth/profile-queries";

export default async function StudentProfilePage() {
  const profile = await getCurrentProfile("/student/profile");

  if (profile.role !== "student") {
    redirect("/profile");
  }

  return <StudentProfile profile={profile} />;
}
