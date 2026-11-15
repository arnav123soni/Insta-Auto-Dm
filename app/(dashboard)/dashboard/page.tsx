"use client";

/**
 * Modern Dashboard Home Page
 *
 * Overview cards with icons, 7-day performance visualizer,
 * top keyword ranking, and real-time activity feed.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import Link from "next/link";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import StatCard from "@/components/stat-card";
import StatusBadge from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowUpRight,
  BarChart2,
  Tag,
  Clock,
  Zap,
} from "lucide-react";

interface DashboardStats {
  userName: string | null;
  contactsCount: number;
  totalAutomations: number;
  activeAutomations: number;
  dmsSentToday: number;
  dmsSentWeek: number;
  dmsSentMonth: number;
  dmsSkippedMonth: number;
  dmsFailedMonth: number;
  totalDMs: number;
  clicksThisMonth: number;
  totalClicks: number;
  ctrThisMonth: number;
  instagramAccounts: AccountOption[];
  selectedInstagramAccountId: string | null;
  topKeywords: { keyword: string; count: number }[];
  dailyDMs: { date: string; count: number }[];
  recentLogs: Array<{
    id: string;
    commenterName: string | null;
    commentText: string;
    status: string;
    createdAt: string;
    automation: { name: string };
    instagramAccount?: { username: string };
  }>;
}

export default function DashboardPage() {
  const { t, label } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedAccountId !== "all") {
      params.set("instagramAccountId", selectedAccountId);
    }

    fetch(`/api/dashboard/stats${params.size ? `?${params}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-5 w-80 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 sm:gap-6">
          <Skeleton className="lg:col-span-3 h-80 rounded-xl" />
          <Skeleton className="lg:col-span-1 h-80 rounded-xl" />
          <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const maxDM = Math.max(...(stats?.dailyDMs.map((d) => d.count) ?? [1]), 1);
  const connectedCount = stats?.instagramAccounts.length ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      {/* Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 border border-white/[0.08] bg-gradient-to-br from-surface via-surface to-surface-elevated/40 shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5">
              <Badge variant="indigo" size="sm" dot pulse>
                <Zap className="w-3 h-3 mr-0.5" />
                <span>System Online</span>
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl tracking-tight">
              {t("Hello, {name}!", { name: stats?.userName ?? t("there") })}
            </h1>
            <p className="text-xs sm:text-sm text-muted flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {t(connectedCount === 1 ? "{count} connected account" : "{count} connected accounts", { count: connectedCount })}
              </span>
              <span>•</span>
              <span>
                {t(stats?.contactsCount === 1 ? "{count} contact" : "{count} contacts", { count: stats?.contactsCount ?? 0 })}
              </span>
              <span>•</span>
              <Link
                href="/logs"
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium underline-offset-4 hover:underline"
              >
                <span>{t("See activity")}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </p>
          </div>

          {stats && stats.instagramAccounts.length > 1 && (
            <div className="shrink-0">
              <AccountSelect
                accounts={stats.instagramAccounts}
                value={selectedAccountId}
                onChange={handleAccountChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          label={t("Active Campaigns")}
          value={stats?.activeAutomations ?? 0}
        />
        <StatCard
          label={t("DMs Sent")}
          value={stats?.dmsSentMonth ?? 0}
          trend={stats?.dmsSentWeek ? `+${stats.dmsSentWeek} wk` : undefined}
          trendUp={true}
        />
        <StatCard label={t("Skipped")} value={stats?.dmsSkippedMonth ?? 0} />
        <StatCard label={t("Failed")} value={stats?.dmsFailedMonth ?? 0} />
        <StatCard label={t("Clicks")} value={stats?.clicksThisMonth ?? 0} />
        <StatCard label={t("CTR")} value={`${stats?.ctrThisMonth ?? 0}%`} />
      </div>

      {/* Chart + Keywords + Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 sm:gap-6">
        {/* 7-Day Performance Chart */}
        <Card className="lg:col-span-3 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                {t("DMs — Last 7 Days")}
              </h2>
            </div>
            <Badge variant="secondary" size="sm">
              {stats?.dmsSentWeek ?? 0} {t("DMs Sent")}
            </Badge>
          </div>

          <div className="flex items-end gap-2 sm:gap-3 h-44 sm:h-48 pt-4">
            {stats?.dailyDMs.map((day) => {
              const heightPercent = Math.max((day.count / maxDM) * 100, 6);
              const isPeak = day.count === maxDM && maxDM > 0;

              return (
                <div
                  key={label(day.date)}
                  className="group min-w-0 flex-1 h-full flex flex-col items-center gap-2"
                >
                  <span className="text-[11px] font-mono font-medium text-muted group-hover:text-indigo-400 transition-colors">
                    {day.count}
                  </span>

                  <div className="w-full min-h-0 flex-1 flex items-end">
                    <div
                      className={`w-full rounded-lg transition-all duration-300 group-hover:scale-105 ${
                        isPeak
                          ? "bg-gradient-to-t from-indigo-600 via-purple-600 to-pink-500 shadow-md shadow-indigo-950/40"
                          : "bg-surface-elevated group-hover:bg-indigo-600/60 border border-white/10"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  <span className="w-full truncate text-center text-[10px] font-medium text-muted group-hover:text-foreground">
                    {label(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Keywords */}
        <Card className="lg:col-span-1 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                <Tag className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                {t("Top Keywords")}
              </h2>
            </div>

            <div className="space-y-2">
              {stats?.topKeywords.length === 0 ? (
                <p className="text-xs text-muted py-8 text-center">
                  {t("No keyword matches yet")}
                </p>
              ) : (
                stats?.topKeywords.slice(0, 5).map((kw, idx) => (
                  <div
                    key={kw.keyword}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-elevated/50 border border-white/[0.06] hover:border-indigo-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-muted/80 w-4">
                        #{idx + 1}
                      </span>
                      <span className="truncate text-xs font-semibold text-foreground">
                        {kw.keyword}
                      </span>
                    </div>
                    <Badge variant="outline" size="sm" className="font-mono text-[10px] py-0 px-1.5">
                      {kw.count}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground tracking-tight">
                  {t("Recent Activity")}
                </h2>
              </div>
              <Link
                href="/logs"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                {t("See activity")}
              </Link>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {stats?.recentLogs.length === 0 ? (
                <p className="text-xs text-muted text-center py-10">
                  {t("No activity yet")}
                </p>
              ) : (
                stats?.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-elevated/40 border border-white/[0.06] hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase">
                        {(log.commenterName?.[0] ?? "U")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          @{log.commenterName ?? "unknown"}
                        </p>
                        <p className="text-[11px] text-muted truncate">
                          &ldquo;{log.commentText}&rdquo;
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={log.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
