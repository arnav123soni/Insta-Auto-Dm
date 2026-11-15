import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import {
  calculateCtr,
  normalizeTopKeywords,
  summarizeDmStatuses,
} from "@/lib/tracking/analytics";

export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = await getCurrentUserId();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const requestedInstagramAccountId =
    request.nextUrl.searchParams.get("instagramAccountId");
  const selectedAccountId =
    requestedInstagramAccountId && requestedInstagramAccountId !== "all"
      ? requestedInstagramAccountId
      : null;
  const accountFilter = selectedAccountId
    ? { instagramAccountId: selectedAccountId }
    : {};

  const clicksThisMonthQuery = selectedAccountId
    ? prisma.$queryRaw<[{ count: bigint | number }]>`
        SELECT COUNT(DISTINCT CONCAT("automationId", ':', CASE
          WHEN "recipientHash" IS NOT NULL AND "recipientHash" != '' THEN CONCAT('r:', "recipientHash")
          WHEN "ipHash" IS NOT NULL AND "ipHash" != '' THEN CONCAT('ip:', "ipHash")
          ELSE CONCAT('click:', "id")
        END)) as count
        FROM "LinkClick"
        WHERE "workspaceId" = ${workspaceId}
          AND "createdAt" >= ${monthStart}
          AND "instagramAccountId" = ${selectedAccountId}
      `.then((res) => Number(res[0]?.count ?? 0))
    : prisma.$queryRaw<[{ count: bigint | number }]>`
        SELECT COUNT(DISTINCT CONCAT("automationId", ':', CASE
          WHEN "recipientHash" IS NOT NULL AND "recipientHash" != '' THEN CONCAT('r:', "recipientHash")
          WHEN "ipHash" IS NOT NULL AND "ipHash" != '' THEN CONCAT('ip:', "ipHash")
          ELSE CONCAT('click:', "id")
        END)) as count
        FROM "LinkClick"
        WHERE "workspaceId" = ${workspaceId}
          AND "createdAt" >= ${monthStart}
      `.then((res) => Number(res[0]?.count ?? 0));

  const totalClicksQuery = selectedAccountId
    ? prisma.$queryRaw<[{ count: bigint | number }]>`
        SELECT COUNT(DISTINCT CONCAT("automationId", ':', CASE
          WHEN "recipientHash" IS NOT NULL AND "recipientHash" != '' THEN CONCAT('r:', "recipientHash")
          WHEN "ipHash" IS NOT NULL AND "ipHash" != '' THEN CONCAT('ip:', "ipHash")
          ELSE CONCAT('click:', "id")
        END)) as count
        FROM "LinkClick"
        WHERE "workspaceId" = ${workspaceId}
          AND "instagramAccountId" = ${selectedAccountId}
      `.then((res) => Number(res[0]?.count ?? 0))
    : prisma.$queryRaw<[{ count: bigint | number }]>`
        SELECT COUNT(DISTINCT CONCAT("automationId", ':', CASE
          WHEN "recipientHash" IS NOT NULL AND "recipientHash" != '' THEN CONCAT('r:', "recipientHash")
          WHEN "ipHash" IS NOT NULL AND "ipHash" != '' THEN CONCAT('ip:', "ipHash")
          ELSE CONCAT('click:', "id")
        END)) as count
        FROM "LinkClick"
        WHERE "workspaceId" = ${workspaceId}
      `.then((res) => Number(res[0]?.count ?? 0));

  const contactsCountQuery = selectedAccountId
    ? prisma.$queryRaw<[{ count: bigint | number }]>`
        SELECT COUNT(DISTINCT "commenterId") as count
        FROM "DmLog"
        WHERE "workspaceId" = ${workspaceId} AND "instagramAccountId" = ${selectedAccountId}
      `.then((res) => Number(res[0]?.count ?? 0))
    : prisma.$queryRaw<[{ count: bigint | number }]>`
        SELECT COUNT(DISTINCT "commenterId") as count
        FROM "DmLog"
        WHERE "workspaceId" = ${workspaceId}
      `.then((res) => Number(res[0]?.count ?? 0));

  const dailyDmsQuery = selectedAccountId
    ? prisma.$queryRaw<{ day: Date; count: bigint | number }[]>`
        SELECT date_trunc('day', "createdAt") as day, count(*) as count
        FROM "DmLog"
        WHERE "workspaceId" = ${workspaceId}
          AND "status" = 'SENT'
          AND "createdAt" >= ${sevenDaysAgo}
          AND "instagramAccountId" = ${selectedAccountId}
        GROUP BY day
        ORDER BY day ASC
      `
    : prisma.$queryRaw<{ day: Date; count: bigint | number }[]>`
        SELECT date_trunc('day', "createdAt") as day, count(*) as count
        FROM "DmLog"
        WHERE "workspaceId" = ${workspaceId}
          AND "status" = 'SENT'
          AND "createdAt" >= ${sevenDaysAgo}
        GROUP BY day
        ORDER BY day ASC
      `;

  const [
    workspace,
    instagramAccount,
    instagramAccounts,
    totalAutomations,
    activeAutomations,
    dmsSentToday,
    dmsSentWeek,
    dmsSentMonth,
    totalDMs,
    dmStatusCountsThisMonth,
    clicksThisMonth,
    totalClicks,
    topKeywordRows,
    recentLogs,
    user,
    contactsCount,
    dailyDmCounts,
  ] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        name: true,
        dmsSentThisPeriod: true,
      },
    }),
    prisma.instagramAccount.findFirst({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: {
        id: true,
        username: true,
        instagramId: true,
        provider: true,
        tokenExpiresAt: true,
        webhookSubscribed: true,
      },
    }),
    prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: {
        id: true,
        username: true,
        instagramId: true,
        name: true,
        provider: true,
        tokenExpiresAt: true,
        webhookSubscribed: true,
      },
    }),
    prisma.automation.count({ where: { workspaceId, ...accountFilter } }),
    prisma.automation.count({
      where: { workspaceId, isActive: true, ...accountFilter },
    }),
    prisma.dmLog.count({
      where: {
        workspaceId,
        status: "SENT",
        createdAt: { gte: todayStart },
        ...accountFilter,
      },
    }),
    prisma.dmLog.count({
      where: {
        workspaceId,
        status: "SENT",
        createdAt: { gte: weekStart },
        ...accountFilter,
      },
    }),
    prisma.dmLog.count({
      where: {
        workspaceId,
        status: "SENT",
        createdAt: { gte: monthStart },
        ...accountFilter,
      },
    }),
    prisma.dmLog.count({
      where: { workspaceId, status: "SENT", ...accountFilter },
    }),
    prisma.dmLog.groupBy({
      by: ["status"],
      where: { workspaceId, createdAt: { gte: monthStart }, ...accountFilter },
      _count: { _all: true },
    }),
    clicksThisMonthQuery,
    totalClicksQuery,
    prisma.dmLog.groupBy({
      by: ["matchedKeyword"],
      where: { workspaceId, matchedKeyword: { not: null }, ...accountFilter },
      _count: { _all: true },
    }),
    prisma.dmLog.findMany({
      where: { workspaceId, ...accountFilter },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        automation: { select: { name: true } },
        instagramAccount: { select: { username: true } },
      },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        })
      : Promise.resolve(null),
    contactsCountQuery,
    dailyDmsQuery,
  ]);

  const dailyDMs = Array.from({ length: 7 }, (_, idx) => {
    const i = 6 - idx;
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const matchingRow = dailyDmCounts.find((row) => {
      const rowDate = new Date(row.day);
      return rowDate >= dayStart && rowDate < dayEnd;
    });

    return {
      date: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
      count: matchingRow ? Number(matchingRow.count) : 0,
    };
  });

  const monthlyStatusSummary = summarizeDmStatuses(
    dmStatusCountsThisMonth.map((row) => ({
      status: row.status,
      _count: row._count._all,
    }))
  );
  const topKeywords = normalizeTopKeywords(
    topKeywordRows.map((row) => ({
      matchedKeyword: row.matchedKeyword,
      _count: row._count._all,
    }))
  );

  const firstName =
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    null;

  return NextResponse.json({
    success: true,
    data: {
      userName: firstName,
      contactsCount,
      workspace,
      instagramAccount,
      instagramAccounts,
      selectedInstagramAccountId: selectedAccountId,
      totalAutomations,
      activeAutomations,
      dmsSentToday,
      dmsSentWeek,
      dmsSentMonth,
      dmsSkippedMonth: monthlyStatusSummary.skipped,
      dmsFailedMonth: monthlyStatusSummary.failed,
      totalDMs,
      clicksThisMonth,
      totalClicks,
      ctrThisMonth: calculateCtr(clicksThisMonth, dmsSentMonth),
      topKeywords,
      dailyDMs,
      recentLogs,
    },
  });
}
