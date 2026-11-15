import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  getRequestIp,
  hashClickIp,
  parseRecipientToken,
} from "@/lib/tracking/server";

type RedirectRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RedirectRouteProps) {
  const { slug } = await params;
  const trackedLink = await prisma.trackedLink.findUnique({
    where: { slug },
    select: {
      id: true,
      workspaceId: true,
      automationId: true,
      destinationUrl: true,
      automation: {
        select: {
          instagramAccountId: true,
        },
      },
    },
  });

  if (!trackedLink) {
    return NextResponse.redirect(new URL("/", request.url), { status: 302 });
  }

  // Validate destination URL defensively
  let destination = trackedLink.destinationUrl;
  try {
    const parsed = new URL(destination);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      destination = "/";
    }
  } catch {
    destination = "/";
  }

  // Record click defensively so database failures do not break the redirect
  try {
    await prisma.linkClick.create({
      data: {
        workspaceId: trackedLink.workspaceId,
        automationId: trackedLink.automationId,
        instagramAccountId: trackedLink.automation.instagramAccountId,
        trackedLinkId: trackedLink.id,
        ipHash: hashClickIp(getRequestIp(request)),
        recipientHash: parseRecipientToken(
          new URL(request.url).searchParams.get("r")
        ),
        userAgent: request.headers.get("user-agent"),
        referrer: request.headers.get("referer"),
      },
    });
  } catch (err) {
    console.error("[Redirect] Failed to log link click:", err);
  }

  return NextResponse.redirect(
    destination.startsWith("/") ? new URL(destination, request.url) : destination,
    { status: 302 }
  );
}
