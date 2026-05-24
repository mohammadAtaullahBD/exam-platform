import { redirect } from "next/navigation";

import { StudentProfile } from "@/features/auth/components/student-profile";
import { TeacherProfile } from "@/features/auth/components/teacher-profile";
import { getCurrentProfile, getTeacherPosts } from "@/features/auth/profile-queries";

export default async function ProfilePage() {
  const profile = await getCurrentProfile("/profile");

  if (profile.role === "teacher") {
    const posts = await getTeacherPosts(profile.id);

    return (
      <TeacherProfile profile={profile} posts={posts} isOwnProfile={true} />
    );
  }

  if (profile.role === "student") {
    return <StudentProfile profile={profile} />;
  }

  redirect("/dashboard");
}
