import { I18nProvider } from "@/lib/i18n/provider";
import { getI18n } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "InstaReply - Instagram Automation Platform" };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = await getI18n();

  const session = await auth();
  const userId = session?.user?.id ?? process.env.LOCAL_OWNER_ID ?? null;
  if (!userId) {
    redirect("/login");
  }

  const userEmail = session?.user?.email ?? process.env.LOCAL_OWNER_EMAIL ?? "owner@instareply.local";

  const workspace = await ensureWorkspaceForUser(userId, userEmail);
  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId: workspace.id, accessToken: { not: "pending" } },
    orderBy: { connectedAt: "desc" },
    select: { username: true },
  });

  return (
    <I18nProvider locale={locale}>
      <DashboardShell
        workspaceName={workspace.name}
        instagramUsername={accounts[0]?.username ?? null}
        instagramAccountCount={accounts.length}
      >
        {children}
      </DashboardShell>
    </I18nProvider>
  );
}
