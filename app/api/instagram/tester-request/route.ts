import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { prisma } from "@/lib/db/client";
import { sendTelegramAdminAlert, escapeMarkdown } from "@/lib/notifications/telegram";

export const runtime = "nodejs";

/**
 * GET /api/instagram/tester-request
 * Fetches the current workspace's tester onboarding request, if any.
 */
export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.instagramAccount.findFirst({
    where: { workspaceId: context.workspaceId },
    orderBy: { connectedAt: "desc" },
    select: {
      id: true,
      username: true,
      onboardingStatus: true,
      inviteSentAt: true,
      inviteAcceptedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: account,
  });
}

/**
 * POST /api/instagram/tester-request
 * Submits an Instagram handle to request a tester invite.
 */
export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawHandle = body?.username ?? body?.handle;
  if (!rawHandle || typeof rawHandle !== "string") {
    return NextResponse.json(
      { success: false, error: "Instagram username is required" },
      { status: 400 }
    );
  }

  const username = rawHandle.replace(/^@/, "").trim().toLowerCase();
  if (!username || username.length > 30) {
    return NextResponse.json(
      { success: false, error: "Invalid Instagram username" },
      { status: 400 }
    );
  }

  // Find or create pending account record
  const existing = await prisma.instagramAccount.findFirst({
    where: { workspaceId: context.workspaceId, username },
  });

  let accountId: string;

  if (existing) {
    accountId = existing.id;
    await prisma.instagramAccount.update({
      where: { id: existing.id },
      data: {
        onboardingStatus: "PENDING_INVITE",
        inviteSentAt: null,
      },
    });
  } else {
    // Generate a placeholder instagramId until OAuth handshake completes
    const placeholderId = `pending_${context.workspaceId}_${Date.now()}`;
    const created = await prisma.instagramAccount.create({
      data: {
        workspaceId: context.workspaceId,
        instagramId: placeholderId,
        username,
        accessToken: "pending",
        onboardingStatus: "PENDING_INVITE",
      },
    });
    accountId = created.id;
  }

  // Dispatch alert to administrator
  const metaAppId = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID;
  const rolesUrl = metaAppId
    ? `https://developers.facebook.com/apps/${encodeURIComponent(metaAppId)}/roles/roles/`
    : "https://developers.facebook.com/apps/";
  const safeUsername = escapeMarkdown(username);
  const safeWorkspaceId = escapeMarkdown(context.workspaceId);
  const alertText = `🚨 *New Creator Onboarding Request!*\n\n` +
    `• *Instagram Handle:* \`@${safeUsername}\`\n` +
    `• *Workspace ID:* \`${safeWorkspaceId}\`\n` +
    `• *Action:* Add as an Instagram Tester in Meta:\n` +
    `👉 [Open Meta App Roles](${rolesUrl})`;

  await sendTelegramAdminAlert(alertText);

  return NextResponse.json({
    success: true,
    data: {
      id: accountId,
      username,
      onboardingStatus: "PENDING_INVITE",
    },
  });
}
