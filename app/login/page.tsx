import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthView } from "@/components/auth/auth-view";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <AuthView />;
}
