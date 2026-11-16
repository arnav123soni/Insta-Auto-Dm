import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id && !process.env.LOCAL_OWNER_ID) {
    redirect("/login");
  }

  return <ProfileView />;
}
