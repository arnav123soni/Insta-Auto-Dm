"use client";

/**
 * Modern Decluttered Campaigns List Page
 *
 * Clean visual hierarchy with top performance summary, unified filters,
 * structured campaign cards, micro-KPI stats, and quick actions.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Plus,
  Upload,
  Play,
  Copy,
  Check,
  MoreVertical,
  Trash2,
  CopyPlus,
  ExternalLink,
  Lock,
  Layers,
  Percent,
  Send,
  X,
  Activity,
  Clock,
  MessageSquare,
} from "lucide-react";

function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

interface Campaign {
  id: string;
  name: string;
  goal: string | null;
  postId: string | null;
  postUrl: string | null;
  pendingNextReel: boolean;
  matchAnyPost: boolean;
  keywords: string[];
  matchAnyWord: boolean;
  dmMessage: string;
  openingDmEnabled: boolean;
  openingDmMessage: string | null;
  openingDmButtonLabel: string | null;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  publicReplyMessages: string[];
  requireFollow: boolean;
  followPromptMessage: string | null;
  followPromptButtonLabel: string | null;
  isActive: boolean;
  wholeWordMatch: boolean;
  instagramAccountId: string;
  instagramAccount?: {
    username: string;
    instagramId: string;
  };
  reportShareSlug: string | null;
  reportShareEnabled: boolean;
  reportUrl: string | null;
  createdAt: string;
  _count: { dmLogs: number };
  trackedLinks: Array<{
    id: string;
    slug: string;
    label: string | null;
    destinationUrl: string;
    trackedUrl: string;
    _count: { clicks: number };
  }>;
  analytics?: {
    sent: number;
    skipped: number;
    failed: number;
    clicks: number;
    ctr: number;
    topKeywords: { keyword: string; count: number }[];
  };
}

export default function CampaignsPage() {
  const { t, label } = useI18n();
  const router = useRouter();
  const [automations, setAutomations] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [playingVideo, setPlayingVideo] = useState<{
    url: string;
    postUrl: string | null;
  } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  const fetchAutomations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedAccountId !== "all") {
        params.set("instagramAccountId", selectedAccountId);
      }
      const res = await fetch(
        `/api/automations${params.size ? `?${params}` : ""}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.success) {
        const automationsList: Campaign[] = Array.isArray(data.data)
          ? data.data
          : (data.data?.automations ?? []);
        setAutomations(automationsList);

        // Load thumbnails & video URLs for posts
        const postIds = automationsList
          .map((a: Campaign) => a.postId)
          .filter(Boolean);

        if (postIds.length > 0) {
          fetch(`/api/instagram/media?ids=${postIds.join(",")}`)
            .then((r) => r.json())
            .then((mediaData) => {
              if (mediaData?.success && Array.isArray(mediaData.data)) {
                const thumbs: Record<string, string> = {};
                const vids: Record<string, string> = {};
                for (const item of mediaData.data) {
                  if (item.thumbnail_url || item.media_url) {
                    thumbs[item.id] = item.thumbnail_url || item.media_url;
                  }
                  if (item.media_type === "VIDEO" && item.media_url) {
                    vids[item.id] = item.media_url;
                  }
                }
                setThumbnails(thumbs);
                setVideos(vids);
              }
            })
            .catch(console.error);
        }
      } else {
        setAutomations([]);
      }
    } catch (err) {
      console.error("Failed to load automations:", err);
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((r) => r.json())
      .then((payload) => {
        if (payload?.success && Array.isArray(payload.data?.instagramAccounts)) {
          setAccounts(payload.data.instagramAccounts);
        }
      })
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchAutomations();
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [fetchAutomations]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await fetch(`/api/automations?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a))
      );
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  }

  async function copyReelUrl(auto: Campaign) {
    setMenuOpenId(null);
    if (!auto.postUrl) return;
    try {
      await navigator.clipboard.writeText(auto.postUrl);
      setCopiedId(auto.id);
      window.setTimeout(
        () => setCopiedId((cur) => (cur === auto.id ? null : cur)),
        1500
      );
    } catch (err) {
      console.error("Failed to copy reel URL:", err);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm(t("Delete this campaign? This cannot be undone."))) return;
    try {
      await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  async function duplicateAutomation(id: string) {
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/automations/duplicate?id=${id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) void fetchAutomations();
      else console.error("Duplicate failed:", data.error);
    } catch (err) {
      console.error("Failed to duplicate:", err);
    }
  }

  // Aggregate stats across visible campaigns
  const stats = useMemo(() => {
    const total = automations.length;
    const active = automations.filter((a) => a.isActive).length;
    let totalSent = 0;
    let totalClicks = 0;
    for (const a of automations) {
      totalSent += a.analytics?.sent ?? 0;
      totalClicks += a.analytics?.clicks ?? 0;
    }
    const ctr = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : "0.0";
    return { total, active, totalSent, totalClicks, ctr };
  }, [automations]);

  const automationsList = Array.isArray(automations) ? automations : [];
  const query = search.trim().toLowerCase();
  const filtered = automationsList.filter((a) => {
    if (statusFilter === "active" && !a.isActive) return false;
    if (statusFilter === "paused" && a.isActive) return false;
    if (!query) return true;
    return (
      (a.name || "").toLowerCase().includes(query) ||
      (a.keywords || []).some((k) => (k || "").toLowerCase().includes(query)) ||
      (a.dmMessage || "").toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header with Title and Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
              {t("Campaigns")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface border border-border text-foreground/80">
              {filtered.length !== automations.length
                ? `${filtered.length} / ${automations.length}`
                : automations.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Automated comment-to-DM triggers converting engagement into high-intent conversations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {accounts.length > 1 && (
            <AccountSelect
              accounts={accounts}
              value={selectedAccountId}
              onChange={handleAccountChange}
            />
          )}

          <Link
            href="/campaigns/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t("Import")}</span>
          </Link>

          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-instagram text-xs font-semibold text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t("New Campaign")}</span>
          </Link>
        </div>
      </div>

      {/* Modern Top Performance Ribbon */}
      {automations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="panel rounded-2xl p-4 border border-border/70 flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Total Campaigns</p>
              <p className="text-lg font-bold text-foreground font-mono">{stats.total}</p>
            </div>
          </div>

          <div className="panel rounded-2xl p-4 border border-border/70 flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted uppercase tracking-wider">{t("Active")}</p>
              <p className="text-lg font-bold text-emerald-400 font-mono">{stats.active}</p>
            </div>
          </div>

          <div className="panel rounded-2xl p-4 border border-border/70 flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted uppercase tracking-wider">DMs Sent</p>
              <p className="text-lg font-bold text-foreground font-mono">{stats.totalSent.toLocaleString()}</p>
            </div>
          </div>

          <div className="panel rounded-2xl p-4 border border-border/70 flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Avg. CTR</p>
              <p className="text-lg font-bold text-amber-400 font-mono">{stats.ctr}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Unified Search & Segmented Filter Bar */}
      {automations.length > 0 && (
        <div className="panel rounded-2xl p-2 sm:p-2.5 border border-border/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search campaigns by name, keyword, or message…")}
              className="w-full rounded-xl border-none bg-surface/80 pl-10 pr-9 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Status Tabs */}
          <div className="inline-flex shrink-0 p-1 rounded-xl bg-surface-hover/50 border border-border/60">
            {(["all", "active", "paused"] as const).map((s) => (
              <button
                key={label(s)}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3.5 py-1 text-xs font-semibold capitalize transition-all ${
                  statusFilter === s
                    ? "bg-accent text-white shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {label(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {automations.length === 0 && (
        <div className="panel rounded-2xl p-10 sm:p-16 text-center max-w-xl mx-auto border-dashed border-2 border-border/80">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-instagram text-white shadow-lg shadow-pink-500/20 mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            {t("No campaigns yet")}
          </h3>
          <p className="text-sm text-muted mb-6">
            {t("Create your first comment-to-DM campaign to turn a post or reel into a measurable conversation flow.")}
          </p>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-instagram text-sm font-semibold text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t("Create Campaign")}</span>
          </Link>
        </div>
      )}

      {/* No Search Matches */}
      {automations.length > 0 && filtered.length === 0 && (
        <div className="panel rounded-2xl p-12 text-center text-sm text-muted space-y-3">
          <Search className="w-8 h-8 mx-auto opacity-40 text-muted" />
          <p>{t("No campaigns match your search.")}</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="text-xs text-accent hover:underline font-semibold"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Decluttered Modern Campaign Cards */}
      <div className="space-y-3.5">
        {filtered.map((auto) => {
          const videoUrl = auto.postId ? videos[auto.postId] : undefined;
          const thumbnail = auto.postId ? thumbnails[auto.postId] : undefined;

          return (
            <div
              key={auto.id}
              onClick={() => router.push(`/campaigns/${auto.id}`)}
              className="panel panel-interactive rounded-2xl p-4 sm:p-5 hover:border-accent/40 cursor-pointer relative group transition-all border border-border/80 hover:shadow-md"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                {/* Media Thumbnail */}
                <div className="relative shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border border-border/80 bg-surface-hover flex items-center justify-center">
                  {thumbnail ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnail}
                        alt={auto.name}
                        className="w-full h-full object-cover"
                      />
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayingVideo({ url: videoUrl, postUrl: auto.postUrl });
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 text-white transition-colors"
                          aria-label={t("Play reel preview")}
                        >
                          <Play className="w-5 h-5 fill-white" />
                        </button>
                      )}
                    </>
                  ) : auto.pendingNextReel ? (
                    <div className="flex flex-col items-center justify-center text-amber-400 p-2 text-center">
                      <Clock className="w-6 h-6 mb-0.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Next Reel</span>
                    </div>
                  ) : auto.matchAnyPost ? (
                    <div className="flex flex-col items-center justify-center text-accent p-2 text-center">
                      <InstagramIcon className="w-6 h-6 mb-0.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Any Post</span>
                    </div>
                  ) : (
                    <InstagramIcon className="w-7 h-7 text-muted opacity-50" />
                  )}
                </div>

                {/* Central Body: Name, Triggers, Keywords, DM preview */}
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Row 1: Title, Account, Live Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-foreground truncate group-hover:text-accent transition-colors">
                      {auto.name}
                    </h3>

                    <span className="shrink-0 rounded-full border border-border/80 bg-surface-hover/80 px-2.5 py-0.5 text-xs font-medium text-muted">
                      @{auto.instagramAccount?.username || "account"}
                    </span>

                    <Badge
                      variant={auto.isActive ? "success" : "secondary"}
                      size="sm"
                      dot
                      pulse={auto.isActive}
                    >
                      {auto.isActive ? t("Active") : t("Paused")}
                    </Badge>

                    {auto.pendingNextReel && (
                      <span className="shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                        {t("Waiting for next reel")}
                      </span>
                    )}

                    {auto.requireFollow && (
                      <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[11px] font-semibold text-violet-400">
                        <Lock className="w-3 h-3" />
                        {t("Follow gate")}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Condition Keywords (Clean Tag Chips) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted font-medium mr-1">
                      {auto.matchAnyWord ? t("Any comment") : "Keywords:"}
                    </span>
                    {!auto.matchAnyWord && (
                      <>
                        {(auto.keywords || []).slice(0, 3).map((kw) => (
                          <span
                            key={kw}
                            className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-semibold border border-accent/20"
                          >
                            #{kw}
                          </span>
                        ))}
                        {(auto.keywords || []).length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-surface text-muted text-[11px] font-mono border border-border">
                            +{auto.keywords.length - 3} more
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Row 3: DM Snippet */}
                  <div className="flex items-center gap-2 text-xs text-muted/90 truncate max-w-2xl bg-surface/50 px-3 py-1.5 rounded-xl border border-border/50">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-accent/80" />
                    <span className="truncate">&ldquo;{auto.dmMessage}&rdquo;</span>
                  </div>
                </div>

                {/* Right: Micro-KPI Stats + Controls */}
                <div
                  className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t border-border/60 lg:border-t-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Micro-KPI Block */}
                  <div className="flex items-center gap-3 sm:gap-4 pr-2">
                    <div className="text-right">
                      <p className="text-[10px] text-muted uppercase font-semibold">{t("Sent")}</p>
                      <p className="text-xs sm:text-sm font-mono font-bold text-foreground">
                        {(auto.analytics?.sent ?? 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="h-7 w-px bg-border/80" />

                    <div className="text-right">
                      <p className="text-[10px] text-muted uppercase font-semibold">{t("Clicks")}</p>
                      <p className="text-xs sm:text-sm font-mono font-bold text-sky-400">
                        {(auto.analytics?.clicks ?? 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="h-7 w-px bg-border/80" />

                    <div className="text-right min-w-[48px]">
                      <p className="text-[10px] text-muted uppercase font-semibold">{t("CTR")}</p>
                      <p className="text-xs sm:text-sm font-mono font-bold text-amber-400">
                        {auto.analytics?.ctr ?? 0}%
                      </p>
                    </div>
                  </div>

                  {/* Action Cluster */}
                  <div className="flex items-center gap-2 pl-2 border-l border-border/80">
                    {/* Copy Reel URL Button */}
                    {auto.postUrl && (
                      <button
                        onClick={() => void copyReelUrl(auto)}
                        className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                        title={t("Copy URL")}
                      >
                        {copiedId === auto.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">{t("Copied!")}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{t("Copy URL")}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Switch Toggle */}
                    <Switch
                      checked={auto.isActive}
                      onCheckedChange={() => toggleActive(auto.id, auto.isActive)}
                    />

                    {/* Actions Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setMenuOpenId((cur) => (cur === auto.id ? null : auto.id))
                        }
                        aria-label={t("More actions")}
                        className="p-1.5 rounded-xl border border-border/80 bg-surface text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpenId === auto.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setMenuOpenId(null)}
                          />
                          <div className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xl backdrop-blur-xl animate-scale-in">
                            <button
                              onClick={() => {
                                setMenuOpenId(null);
                                router.push(`/campaigns/${auto.id}/edit`);
                              }}
                              className="flex items-center gap-2 w-full px-3.5 py-2.5 text-left text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5 text-muted" />
                              <span>{t("Edit campaign")}</span>
                            </button>
                            <button
                              onClick={() => void duplicateAutomation(auto.id)}
                              className="flex items-center gap-2 w-full px-3.5 py-2.5 text-left text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
                            >
                              <CopyPlus className="w-3.5 h-3.5 text-muted" />
                              <span>{t("Duplicate")}</span>
                            </button>
                            <button
                              onClick={() => {
                                setMenuOpenId(null);
                                void deleteAutomation(auto.id);
                              }}
                              className="flex items-center gap-2 w-full px-3.5 py-2.5 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>{t("Delete")}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Lightbox Modal */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="relative flex max-w-full flex-col items-end gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-xs font-semibold">
              {playingVideo.postUrl && (
                <a
                  href={playingVideo.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors"
                >
                  <span>{t("Open on Instagram")}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setPlayingVideo(null)}
                className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <video
              src={playingVideo.url}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
