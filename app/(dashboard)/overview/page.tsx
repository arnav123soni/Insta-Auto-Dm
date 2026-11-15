"use client";

/**
 * Modern Instagram Overview & Analytics Page
 *
 * Aggregate reach/engagement across recent posts, follower growth trend chart,
 * and per-post performance metrics table with direct links.
 */

import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import AccountSelect from "@/components/account-select";
import StatCard from "@/components/stat-card";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const FollowerChart = dynamic(() => import("@/components/follower-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 rounded-2xl" />,
});
import type { OverviewResponse } from "@/app/api/instagram/overview/route";
import {
  Users,
  AlertTriangle,
} from "lucide-react";

function formatNumber(n: number | null, locale: Locale): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(locale);
}

function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

const COUNT_OPTIONS = [
  { value: "25", label: "Last 25" },
  { value: "50", label: "Last 50" },
  { value: "100", label: "Last 100" },
  { value: "all", label: "All time" },
] as const;

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [count, setCount] = useState("50");

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedAccountId !== "all") {
      params.set("instagramAccountId", selectedAccountId);
    }
    params.set("count", count);

    fetch(`/api/instagram/overview?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
          setError(null);
        } else {
          setError(res.error ?? "Failed to load overview");
        }
      })
      .catch(() => setError("Failed to load overview"))
      .finally(() => setLoading(false));
  }, [selectedAccountId, count]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  function handleCountChange(next: string) {
    setLoading(true);
    setCount(next);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel rounded-2xl p-10 text-center max-w-lg mx-auto animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          {error === "Failed to load overview" ? t("Failed to load overview") : error}
        </p>
        {error.includes("connect") && (
          <a
            href="/api/instagram/connect"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-instagram text-xs font-semibold text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-all"
          >
            <span>{t("Connect Instagram")}</span>
          </a>
        )}
      </div>
    );
  }

  if (!data) return null;

  const totals = data.totals ?? {
    posts: 0,
    views: 0,
    reach: 0,
    likes: 0,
    comments: 0,
    saved: 0,
    shares: 0,
    interactions: 0,
  };
  const posts = Array.isArray(data.posts) ? data.posts : [];
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const followerHistory = Array.isArray(data.followerHistory) ? data.followerHistory : [];
  const followers = data.followers ?? null;
  const username = data.account?.username ?? accounts[0]?.username ?? "";
  const insightsAvailable = Boolean(data.insightsAvailable);

  return (
    <div className="space-y-8 animate-fade-in">
      {data.limitations?.map((note) => (
        <p key={note} className="text-xs sm:text-sm text-muted bg-surface-hover/60 px-4 py-2.5 rounded-xl border border-border">
          {note}
        </p>
      ))}

      {/* Header with Title, Range Picker, and Account Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
              {t("Overview")}
            </h1>
            {followers !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>{followers.toLocaleString(locale)} {t("followers")}</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted">
            {data.provider !== "ZERNIO" && data.requestedCount === "all" ? t("All-time") : t("Recent")} —{" "}
            {t(totals.posts === 1 ? "{count} post" : "{count} posts", { count: totals.posts })}{" "}
            {username ? (
              <>
                {t("from @")}
                <span className="font-semibold text-foreground">{username}</span>
              </>
            ) : null}
            {data.truncated ? t(" (capped at {count})", { count: totals.posts }) : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Range Selector */}
          <div className="inline-flex items-center p-1 rounded-xl bg-surface border border-border/80">
            {COUNT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => handleCountChange(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  count === o.value
                    ? "bg-accent text-white shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t(o.label)}
              </button>
            ))}
          </div>

          {/* Account Picker */}
          {accounts.length > 1 && (
            <AccountSelect
              accounts={accounts.map((a) => ({
                id: a.id,
                username: a.username,
                instagramId: a.id,
              }))}
              value={selectedAccountId}
              onChange={handleAccountChange}
            />
          )}
        </div>
      </div>

      {!insightsAvailable && (
        <div className="panel rounded-2xl p-4 sm:p-5 border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs sm:text-sm font-semibold text-amber-300">
            {t("Views, reach, saved and shares need the insights permission.")}
          </p>
          <p className="text-xs text-muted mt-1">
            {t("Reconnect your account to grant it — likes and comments are shown in the meantime.")}
          </p>
          <a
            href="/api/instagram/connect"
            className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
          >
            {t("Reconnect Instagram")}
          </a>
        </div>
      )}

      {/* Aggregate KPI Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard label={t("Views")} value={formatNumber(totals.views, locale)} />
        <StatCard label={t("Reach")} value={formatNumber(totals.reach, locale)} />
        <StatCard label={t("Likes")} value={formatNumber(totals.likes, locale)} />
        <StatCard label={t("Comments")} value={formatNumber(totals.comments, locale)} />
        <StatCard label={t("Saved")} value={formatNumber(totals.saved, locale)} />
        <StatCard label={t("Shares")} value={formatNumber(totals.shares, locale)} />
      </div>

      {/* Follower History Trend Visualizer */}
      <FollowerChart data={followerHistory} followers={followers} />

      {/* Per-Post Performance Table */}
      <div className="panel rounded-2xl p-5 sm:p-6 border border-border/80 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              {t("Posts")}
            </h2>
            <span className="text-xs font-mono text-muted bg-surface-hover px-2 py-0.5 rounded-md border border-border">
              {posts.length}
            </span>
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="text-xs text-muted py-12 text-center">{t("No posts found")}</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[760px] text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted border-b border-border/80 bg-surface-hover/30">
                  <th className="py-3 px-4 sm:px-6">{t("Post")}</th>
                  <th className="py-3 px-3 text-right">{t("Views")}</th>
                  <th className="py-3 px-3 text-right">{t("Reach")}</th>
                  <th className="py-3 px-3 text-right">{t("Likes")}</th>
                  <th className="py-3 px-3 text-right">{t("Comments")}</th>
                  <th className="py-3 px-3 text-right">{t("Saved")}</th>
                  <th className="py-3 px-3 text-right">{t("Shares")}</th>
                  <th className="py-3 px-4 text-right sm:px-6">{t("Date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {posts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-surface-hover/60 transition-colors group"
                  >
                    <td className="py-3 px-4 sm:px-6 max-w-xs">
                      {p.permalink ? (
                        <a
                          href={p.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-foreground hover:text-accent truncate block transition-colors"
                        >
                          {p.caption || t("{type} post", { type: p.mediaType })}
                        </a>
                      ) : (
                        <span className="font-medium text-foreground truncate block">
                          {p.caption || t("{type} post", { type: p.mediaType })}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground/80 font-mono">
                      {formatNumber(p.views, locale)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground/80 font-mono">
                      {formatNumber(p.reach, locale)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground/80 font-mono">
                      {formatNumber(p.likes, locale)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground/80 font-mono">
                      {formatNumber(p.comments, locale)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground/80 font-mono">
                      {formatNumber(p.saved, locale)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground/80 font-mono">
                      {formatNumber(p.shares, locale)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted font-mono whitespace-nowrap sm:px-6">
                      {formatDate(p.timestamp, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
