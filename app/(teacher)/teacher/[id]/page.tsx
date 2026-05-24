import { TeacherProfile } from "@/features/auth/components/teacher-profile";
import { getTeacherProfilePageData } from "@/features/auth/profile-queries";

type TeacherPublicProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherPublicProfilePage({
  params,
}: TeacherPublicProfilePageProps) {
  const { id } = await params;
  const { profile, posts, viewerId } = await getTeacherProfilePageData(id);

  return (
    <TeacherProfile
      profile={profile}
      posts={posts}
      isOwnProfile={viewerId === profile.id}
    />
  );
}
