"use client";

/**
 * Modern Decluttered Campaign Builder
 *
 * Re-structured two-pane campaign architect with clear progressive steps,
 * breathing room for all inputs, intuitive toggle cards, and a sticky iPhone 17 live preview.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import PostPicker from "@/components/post-picker";
import CampaignPreview, { type PreviewTab } from "@/components/campaign-preview";
import { readCache, writeCache } from "@/lib/client-cache";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IMPORT_QUEUE_KEY,
  IMPORT_ACCOUNT_KEY,
  type ImportRow,
} from "@/lib/import-queue";
import {
  ArrowLeft,
  Check,
  Clock,
  Globe,
  Hash,
  Link2,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  AlertCircle,
  Video,
} from "lucide-react";

type TriggerScope = "specific" | "any" | "next";
type MatchMode = "specific" | "any";

interface LoadedCampaign {
  id: string;
  name: string;
  postId: string | null;
  postUrl: string | null;
  pendingNextReel: boolean;
  matchAnyPost: boolean;
  keywords: string[];
  matchAnyWord: boolean;
  dmTriggerEnabled: boolean;
  dmMessage: string;
  openingDmEnabled: boolean;
  openingDmMessage: string | null;
  openingDmButtonLabel: string | null;
  linkButtonLabel: string | null;
  requireFollow: boolean;
  followPromptMessage: string | null;
  followPromptButtonLabel: string | null;
  followUpEnabled: boolean;
  followUpMessage: string | null;
  followUpDelayMinutes: number | null;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  publicReplyMessages: string[];
  isActive: boolean;
  instagramAccountId: string;
  trackedLinks?: { destinationUrl: string; label?: string | null }[];
}

interface CampaignBuilderProps {
  mode: "new" | "edit";
  campaignId?: string;
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked
          ? "bg-accent shadow-sm shadow-pink-500/20"
          : "bg-surface-hover border-border"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function CampaignBuilder({ mode, campaignId }: CampaignBuilderProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [loading, setLoading] = useState(mode === "edit");
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const [triggerScope, setTriggerScope] = useState<TriggerScope>("specific");
  const [postId, setPostId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [postThumb, setPostThumb] = useState<string | null>(null);
  const [postCaption, setPostCaption] = useState("");

  const [usedPosts, setUsedPosts] = useState<Record<string, string>>({});

  const [matchMode, setMatchMode] = useState<MatchMode>("specific");
  const [keywordText, setKeywordText] = useState("");
  const [dmTriggerEnabled, setDmTriggerEnabled] = useState(false);

  const [publicReplyEnabled, setPublicReplyEnabled] = useState(false);
  const [publicReplyMessages, setPublicReplyMessages] = useState<string[]>([""]);

  const [openingDmEnabled, setOpeningDmEnabled] = useState(false);
  const [openingDmMessage, setOpeningDmMessage] = useState("");
  const [openingDmButtonLabel, setOpeningDmButtonLabel] = useState("");

  const [dmMessage, setDmMessage] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [trackedDestinationUrl, setTrackedDestinationUrl] = useState("");
  const [linkButtonLabel, setLinkButtonLabel] = useState("Open link");
  const [secondLinkOpen, setSecondLinkOpen] = useState(false);
  const [secondaryDestinationUrl, setSecondaryDestinationUrl] = useState("");
  const [secondaryButtonLabel, setSecondaryButtonLabel] = useState("Open link");
  const [requireFollow, setRequireFollow] = useState(false);
  const [followPromptMessage, setFollowPromptMessage] = useState("");
  const [followPromptButtonLabel, setFollowPromptButtonLabel] = useState("i'm following");
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [followUpDelayMinutes, setFollowUpDelayMinutes] = useState(0);

  const [previewTab, setPreviewTab] = useState<PreviewTab>("dm");

  const [importQueue, setImportQueue] = useState<ImportRow[] | null>(null);
  const [importTotal, setImportTotal] = useState(0);

  const keywords = useMemo(
    () =>
      keywordText
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    [keywordText]
  );

  const deferredDmMessage = useDeferredValue(dmMessage);
  const deferredOpeningDmMessage = useDeferredValue(openingDmMessage);
  const deferredOpeningDmButtonLabel = useDeferredValue(openingDmButtonLabel);
  const deferredFollowPromptMessage = useDeferredValue(followPromptMessage);
  const deferredFollowPromptButtonLabel = useDeferredValue(followPromptButtonLabel);
  const deferredFollowUpMessage = useDeferredValue(followUpMessage);
  const deferredPublicReplyMessages = useDeferredValue(publicReplyMessages);
  const deferredKeywords = useDeferredValue(keywords);
  const deferredLinkButtonLabel = useDeferredValue(linkButtonLabel);
  const deferredTrackedDestinationUrl = useDeferredValue(trackedDestinationUrl);
  const deferredSecondaryDestinationUrl = useDeferredValue(secondaryDestinationUrl);
  const deferredSecondaryButtonLabel = useDeferredValue(secondaryButtonLabel);

  useEffect(() => {
    if (!selectedAccountId) return;
    let cancelled = false;
    const cacheKey = `ig-avatar:${selectedAccountId}`;
    const cached = readCache<string | null>(cacheKey, 30 * 60 * 1000);
    queueMicrotask(() => {
      if (!cancelled && cached.data !== null) {
        setAvatarUrl(cached.data);
      }
    });

    const params = new URLSearchParams({ instagramAccountId: selectedAccountId });
    fetch(`/api/instagram/profile?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const url = d.success ? d.data.profilePictureUrl ?? null : null;
        setAvatarUrl(url);
        writeCache(cacheKey, url);
      })
      .catch(() => {
        if (!cancelled && cached.data === null) setAvatarUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.success) return;
        const next: AccountOption[] = payload.data.instagramAccounts ?? [];
        setAccounts(next);
        setSelectedAccountId(
          (prev) => prev || payload.data.selectedInstagramAccountId || next[0]?.id || ""
        );
      })
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !campaignId) return;
    fetch("/api/automations", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.success) return setNotFound(true);
        const list = Array.isArray(payload.data) ? payload.data : payload.data?.automations ?? [];
        const c = (list as LoadedCampaign[]).find((x) => x.id === campaignId);
        if (!c) return setNotFound(true);
        setName(c.name);
        setSelectedAccountId(c.instagramAccountId);
        setTriggerScope(
          c.matchAnyPost ? "any" : c.pendingNextReel ? "next" : "specific"
        );
        setPostId(c.postId);
        setPostUrl(c.postUrl);
        setMatchMode(c.matchAnyWord ? "any" : "specific");
        setKeywordText(c.keywords.join(", "));
        setDmTriggerEnabled(c.dmTriggerEnabled ?? false);
        setPublicReplyEnabled(c.publicReplyEnabled);
        setPublicReplyMessages(
          c.publicReplyMessages?.length
            ? c.publicReplyMessages
            : c.publicReplyMessage
              ? [c.publicReplyMessage]
              : [""]
        );
        setOpeningDmEnabled(c.openingDmEnabled);
        setOpeningDmMessage(c.openingDmMessage ?? "");
        setOpeningDmButtonLabel(c.openingDmButtonLabel ?? "");
        setDmMessage(c.dmMessage);
        setLinkButtonLabel(c.linkButtonLabel ?? "Open link");
        setIsActive(c.isActive);
        const link = c.trackedLinks?.[0]?.destinationUrl ?? "";
        setTrackedDestinationUrl(link);
        setLinkOpen(Boolean(link));
        const secondLink = c.trackedLinks?.[1];
        setSecondaryDestinationUrl(secondLink?.destinationUrl ?? "");
        setSecondaryButtonLabel(secondLink?.label ?? "Open link");
        setSecondLinkOpen(Boolean(secondLink?.destinationUrl));
        setRequireFollow(c.requireFollow ?? false);
        setFollowPromptMessage(c.followPromptMessage ?? "");
        setFollowPromptButtonLabel(
          c.followPromptButtonLabel ?? "i'm following"
        );
        setFollowUpEnabled(c.followUpEnabled ?? false);
        setFollowUpMessage(c.followUpMessage ?? "");
        setFollowUpDelayMinutes(c.followUpDelayMinutes ?? 0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [mode, campaignId]);

  useEffect(() => {
    if (!selectedAccountId) return;
    let cancelled = false;
    fetch("/api/automations", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => {
        if (cancelled || !payload.success) return;
        const list = Array.isArray(payload.data) ? payload.data : payload.data?.automations ?? [];
        const map: Record<string, string> = {};
        for (const a of list as LoadedCampaign[]) {
          if (!a.postId) continue;
          if (a.instagramAccountId !== selectedAccountId) continue;
          if (mode === "edit" && a.id === campaignId) continue;
          map[a.postId] = a.name;
        }
        setUsedPosts(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, mode, campaignId]);

  function prefillFromRow(row: ImportRow) {
    setName(row.name ?? "");
    setTriggerScope("specific");
    setPostId(null);
    setPostUrl(null);
    setPostThumb(null);
    setPostCaption("");
    setMatchMode("specific");
    setKeywordText((row.keywords ?? []).join(", "));
    setDmMessage(row.dmMessage ?? "");
    setPublicReplyEnabled(Boolean(row.publicReply));
    setPublicReplyMessages(row.publicReply ? [row.publicReply] : [""]);
    const hasOpening = Boolean(row.openingDmMessage);
    setOpeningDmEnabled(hasOpening);
    setOpeningDmMessage(row.openingDmMessage ?? "");
    setOpeningDmButtonLabel(
      row.openingDmButtonLabel || (hasOpening ? "Send link" : "")
    );
    const link = row.trackedUrl ?? "";
    setTrackedDestinationUrl(link);
    setLinkOpen(Boolean(link));
    setError(null);
  }

  useEffect(() => {
    if (mode !== "new") return;
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(IMPORT_QUEUE_KEY);
        const acct = window.localStorage.getItem(IMPORT_ACCOUNT_KEY);
        if (!raw) return;
        const queue = JSON.parse(raw) as ImportRow[];
        if (!Array.isArray(queue) || queue.length === 0) return;
        setImportQueue(queue);
        setImportTotal(queue.length);
        if (acct) setSelectedAccountId(acct);
        prefillFromRow(queue[0]);
      } catch {
        // ignore
      }
    });
  }, [mode]);

  const username =
    accounts.find((a) => a.id === selectedAccountId)?.username ?? "yourbrand";

  function handlePostSelect(
    id: string,
    url?: string,
    thumb?: string,
    caption?: string
  ) {
    setPostId(id);
    setPostUrl(url ?? null);
    setPostThumb(thumb ?? null);
    setPostCaption(caption ?? "");
  }

  function insertToken(token: "{link}" | "{username}") {
    setDmMessage((cur) => {
      if (cur.includes(token)) return cur;
      return `${cur.trim()} ${token}`.trim();
    });
  }

  function ensureLinkToken() {
    setDmMessage((cur) => (cur.includes("{link}") ? cur : `${cur.trim()} {link}`.trim()));
  }

  async function handleSubmit(activeValue: boolean) {
    setError(null);

    if (!selectedAccountId) return setError(t("Connect an Instagram account first."));
    if (triggerScope === "specific" && !postId)
      return setError(t("Pick a post or reel to trigger the campaign."));
    if (matchMode === "specific" && keywords.length === 0)
      return setError(t("Add at least one keyword, or switch to any word."));
    if (!dmMessage.trim()) return setError(t("Add the DM with the link."));
    if (openingDmEnabled && (!openingDmMessage.trim() || !openingDmButtonLabel.trim()))
      return setError(t("Your opening DM needs a message and a button label."));

    setSaving(true);

    const payload = {
      name: name.trim() || `Campaign for @${username}`,
      instagramAccountId: selectedAccountId,
      postId: triggerScope === "specific" ? postId : null,
      postUrl: triggerScope === "specific" ? postUrl : null,
      matchAnyPost: triggerScope === "any",
      pendingNextReel: triggerScope === "next",
      matchAnyWord: matchMode === "any",
      keywords: matchMode === "any" ? [] : keywords,
      dmTriggerEnabled,
      dmMessage,
      openingDmEnabled,
      openingDmMessage: openingDmEnabled ? openingDmMessage : null,
      openingDmButtonLabel: openingDmEnabled ? openingDmButtonLabel : null,
      publicReplyEnabled,
      publicReplyMessages: publicReplyEnabled
        ? publicReplyMessages.map((m) => m.trim()).filter(Boolean)
        : [],
      trackedDestinationUrl: trackedDestinationUrl.trim() || "",
      linkButtonLabel: linkButtonLabel.trim() || "Open link",
      secondaryDestinationUrl: secondaryDestinationUrl.trim() || "",
      secondaryButtonLabel: secondaryButtonLabel.trim() || "Open link",
      requireFollow,
      followPromptMessage: requireFollow ? followPromptMessage.trim() : "",
      followPromptButtonLabel: requireFollow
        ? followPromptButtonLabel.trim() || "i'm following"
        : "",
      followUpEnabled,
      followUpMessage: followUpEnabled ? followUpMessage.trim() : "",
      followUpDelayMinutes: followUpEnabled ? followUpDelayMinutes : 0,
      isActive: activeValue,
    };

    try {
      const res =
        mode === "new"
          ? await fetch("/api/automations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/automations?id=${campaignId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      const data = await res.json();
      if (data.success) {
        if (postId) {
          setUsedPosts((prev) => ({
            ...prev,
            [postId]: name.trim() || `Campaign for @${username}`,
          }));
        }

        if (importQueue && importQueue.length > 1) {
          const remaining = importQueue.slice(1);
          try {
            window.localStorage.setItem(IMPORT_QUEUE_KEY, JSON.stringify(remaining));
          } catch {
            // ignore
          }
          setImportQueue(remaining);
          prefillFromRow(remaining[0]);
          if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        if (importQueue) {
          try {
            window.localStorage.removeItem(IMPORT_QUEUE_KEY);
            window.localStorage.removeItem(IMPORT_ACCOUNT_KEY);
          } catch {
            // ignore
          }
        }

        router.push("/campaigns");
        router.refresh();
      } else {
        setError(data.error ?? t("Failed to save campaign"));
        if (typeof window !== "undefined")
          window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError(t("Failed to save campaign"));
    } finally {
      setSaving(false);
    }
  }

  function skipRow() {
    if (!importQueue) return;
    setError(null);
    if (importQueue.length > 1) {
      const remaining = importQueue.slice(1);
      try {
        window.localStorage.setItem(IMPORT_QUEUE_KEY, JSON.stringify(remaining));
      } catch {
        // ignore
      }
      setImportQueue(remaining);
      prefillFromRow(remaining[0]);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
      return;
    }
    try {
      window.localStorage.removeItem(IMPORT_QUEUE_KEY);
      window.localStorage.removeItem(IMPORT_ACCOUNT_KEY);
    } catch {
      // ignore
    }
    router.push("/campaigns");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto py-8">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <Skeleton className="h-[600px] rounded-2xl" />
          <Skeleton className="h-[600px] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="panel rounded-2xl p-12 text-center max-w-md mx-auto my-12 animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 mx-auto mb-4 border border-rose-500/20">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">{t("Campaign not found.")}</h3>
        <p className="text-xs text-muted mb-6">The campaign you are looking for may have been removed or deleted.</p>
        <button
          onClick={() => router.push("/campaigns")}
          className="rounded-xl gradient-instagram px-5 py-2 text-xs font-semibold text-white shadow-md shadow-pink-500/20"
        >
          {t("Back to campaigns")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Import Notice Banner */}
      {importQueue && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-foreground">
              {t("Importing {current} of {total}.", {
                current: importTotal - importQueue.length + 1,
                total: importTotal,
              })}
            </span>{" "}
            <span className="text-muted">
              {t(
                "Fields are prefilled from your CSV. Pick the reel, edit anything, and save to load the next one — or Skip if you don’t want this one."
              )}
            </span>
          </div>
        </div>
      )}

      {/* Top Floating Action & Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 panel rounded-2xl p-4 sm:px-6 border border-border/80 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/campaigns")}
            className="p-1.5 rounded-xl border border-border/80 bg-surface text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            title="Back to campaigns"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
                {mode === "edit" ? name || t("Untitled campaign") : t("New campaign")}
              </h1>
              {mode === "edit" && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase border ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  }`}
                >
                  {isActive ? t("LIVE") : t("PAUSED")}
                </span>
              )}
            </div>
            <p className="text-xs text-muted truncate">
              Connected to <span className="font-semibold text-foreground">@{username}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 ml-auto">
          {importQueue && (
            <button
              type="button"
              onClick={skipRow}
              disabled={saving}
              className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              {importQueue.length > 1 ? t("Skip") : t("Skip & finish")}
            </button>
          )}

          {mode === "edit" &&
            (isActive ? (
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                {t("Stop")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                {t("Go Live")}
              </button>
            ))}

          <button
            type="button"
            onClick={() => handleSubmit(mode === "new" ? true : isActive)}
            disabled={saving}
            className="rounded-xl gradient-instagram px-5 py-2 text-xs font-semibold text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-all disabled:opacity-50"
          >
            {saving
              ? t("Saving…")
              : mode === "new"
                ? t("Go Live")
                : t("Save changes")}
          </button>
        </div>
      </div>

      {/* Main Builder Grid: Left Config Panel + Right Phone Mockup */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_420px] items-start">
        {/* Left: Clean Progressive Step Cards */}
        <div className="space-y-6 min-w-0">
          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-400 flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: General Details & Target Media */}
          <div className="panel rounded-2xl p-5 sm:p-6 border border-border/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg gradient-instagram text-white text-xs font-bold shadow-xs">
                1
              </span>
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Campaign Target & Media
              </h2>
            </div>

            {/* Campaign Name & Account */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("Campaign name")}{" "}
                  <span className="text-muted font-normal">{t("(optional)")}</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("e.g. YC referral")}
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
                  maxLength={100}
                />
              </div>

              {accounts.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t("Instagram account")}
                  </label>
                  <AccountSelect
                    accounts={accounts}
                    value={selectedAccountId}
                    onChange={(id) => {
                      setSelectedAccountId(id);
                      setPostId(null);
                      setPostUrl(null);
                      setPostThumb(null);
                    }}
                    includeAll={false}
                  />
                </div>
              )}
            </div>

            {/* Post Target Selection Cards */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-foreground block">
                {t("When someone comments on")}
              </label>
              <div className="grid sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTriggerScope("specific")}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    triggerScope === "specific"
                      ? "border-accent bg-accent/10 shadow-xs"
                      : "border-border bg-surface hover:border-border-hover"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Video className={`w-4 h-4 ${triggerScope === "specific" ? "text-accent" : "text-muted"}`} />
                    {triggerScope === "specific" && <Check className="w-3.5 h-3.5 text-accent" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{t("a specific post or reel")}</p>
                    <p className="text-[11px] text-muted mt-0.5">Attach to selected post</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTriggerScope("any")}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    triggerScope === "any"
                      ? "border-accent bg-accent/10 shadow-xs"
                      : "border-border bg-surface hover:border-border-hover"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Globe className={`w-4 h-4 ${triggerScope === "any" ? "text-accent" : "text-muted"}`} />
                    {triggerScope === "any" && <Check className="w-3.5 h-3.5 text-accent" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{t("any post or reel")}</p>
                    <p className="text-[11px] text-muted mt-0.5">Triggers on all posts</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTriggerScope("next")}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    triggerScope === "next"
                      ? "border-accent bg-accent/10 shadow-xs"
                      : "border-border bg-surface hover:border-border-hover"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Clock className={`w-4 h-4 ${triggerScope === "next" ? "text-accent" : "text-muted"}`} />
                    {triggerScope === "next" && <Check className="w-3.5 h-3.5 text-accent" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{t("next post or reel")}</p>
                    <p className="text-[11px] text-muted mt-0.5">Attaches automatically</p>
                  </div>
                </button>
              </div>

              {/* Nested Post Picker if Specific */}
              {triggerScope === "specific" && (
                <div className="pt-3">
                  <div className="rounded-xl border border-border/80 bg-surface/50 p-3">
                    <PostPicker
                      selectedPostId={postId}
                      instagramAccountId={selectedAccountId}
                      usedPostIds={usedPosts}
                      onSelect={handlePostSelect}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: Comment Triggers & Detection Rules */}
          <div className="panel rounded-2xl p-5 sm:p-6 border border-border/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg gradient-instagram text-white text-xs font-bold shadow-xs">
                2
              </span>
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Detection & Comment Rules
              </h2>
            </div>

            {/* Match Mode Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                {t("And this comment has")}
              </label>
              <div className="grid sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMatchMode("specific")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    matchMode === "specific"
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface hover:border-border-hover"
                  }`}
                >
                  <Hash className={`w-4 h-4 ${matchMode === "specific" ? "text-accent" : "text-muted"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{t("a specific word or words")}</p>
                    <p className="text-[11px] text-muted">Triggers on matched keywords</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchMode("any")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    matchMode === "any"
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface hover:border-border-hover"
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 ${matchMode === "any" ? "text-accent" : "text-muted"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{t("any word")}</p>
                    <p className="text-[11px] text-muted">Triggers on any comment</p>
                  </div>
                </button>
              </div>

              {/* Keywords Input */}
              {matchMode === "specific" && (
                <div className="pt-2 space-y-1.5">
                  <input
                    value={keywordText}
                    onChange={(e) => setKeywordText(e.target.value)}
                    placeholder={t("Enter a word or multiple")}
                    className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
                  />
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-muted">
                    <span>{t("Use commas to separate words")}</span>
                    {keywords.length > 0 && (
                      <span className="font-mono text-accent font-semibold">
                        {keywords.length} {keywords.length === 1 ? "keyword" : "keywords"} recognized
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Direct DM Trigger Switch Card */}
            <div className="rounded-xl border border-border/80 bg-surface/50 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    {t("also reply when someone DMs")}{" "}
                    {matchMode === "any" ? t("anything") : t("these words")}
                  </p>
                  <p className="text-[11px] text-muted">
                    {matchMode === "any"
                      ? t("Every DM to this account gets the reply below — use with care.")
                      : t("A DM containing any of these words gets the same reply, no comment needed.")}
                  </p>
                </div>
                <Switch
                  checked={dmTriggerEnabled}
                  onChange={() => setDmTriggerEnabled(!dmTriggerEnabled)}
                />
              </div>
            </div>

            {/* Public Comment Auto-Reply Switch Card */}
            <div className="rounded-xl border border-border/80 bg-surface/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    {t("reply to their comments under the post")}
                  </p>
                  <p className="text-[11px] text-muted">
                    {t("One is picked at random each time, so replies don't look identical.")}
                  </p>
                </div>
                <Switch
                  checked={publicReplyEnabled}
                  onChange={() => setPublicReplyEnabled(!publicReplyEnabled)}
                />
              </div>

              {publicReplyEnabled && (
                <div className="space-y-2.5 pt-2 border-t border-border/60 animate-fade-in">
                  {publicReplyMessages.map((msg, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={msg}
                        onChange={(e) =>
                          setPublicReplyMessages((prev) =>
                            prev.map((m, idx) => (idx === i ? e.target.value : m))
                          )
                        }
                        placeholder={t("Sent you a DM! 📩")}
                        maxLength={1000}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
                      />
                      {publicReplyMessages.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPublicReplyMessages((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          className="p-2 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          title={t("Remove reply")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {publicReplyMessages.length < 10 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPublicReplyMessages((prev) => [...prev, ""])
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t("+ Add another reply")}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: Message Delivery & Conversion Link */}
          <div className="panel rounded-2xl p-5 sm:p-6 border border-border/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg gradient-instagram text-white text-xs font-bold shadow-xs">
                3
              </span>
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Direct Message & Offer Link
              </h2>
            </div>

            {/* Opening DM Toggle Card */}
            <div className="rounded-xl border border-border/80 bg-surface/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">{t("an opening DM")}</p>
                  <p className="text-[11px] text-muted">
                    Starts an interactive conversation prompt before revealing the link.
                  </p>
                </div>
                <Switch
                  checked={openingDmEnabled}
                  onChange={() => setOpeningDmEnabled(!openingDmEnabled)}
                />
              </div>

              {openingDmEnabled && (
                <div className="space-y-3 pt-2 border-t border-border/60 animate-fade-in">
                  <textarea
                    value={openingDmMessage}
                    onChange={(e) => setOpeningDmMessage(e.target.value)}
                    placeholder={t("Hey there! I'm so happy you're here 😊")}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-none"
                    maxLength={1000}
                  />
                  <input
                    value={openingDmButtonLabel}
                    onChange={(e) => setOpeningDmButtonLabel(e.target.value)}
                    placeholder={t("Send me the link")}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                    maxLength={64}
                  />
                </div>
              )}
            </div>

            {/* Follow Requirement Toggle Card */}
            <div className="rounded-xl border border-border/80 bg-surface/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    {t("a follow requirement first")}
                  </p>
                  <p className="text-[11px] text-muted">
                    {t(
                      "We send the link only after they tap the button and Instagram confirms the follow. If it can't be verified, we send it anyway."
                    )}
                  </p>
                </div>
                <Switch
                  checked={requireFollow}
                  onChange={() => setRequireFollow(!requireFollow)}
                />
              </div>

              {requireFollow && (
                <div className="space-y-3 pt-2 border-t border-border/60 animate-fade-in">
                  <textarea
                    value={followPromptMessage}
                    onChange={(e) => setFollowPromptMessage(e.target.value)}
                    placeholder={t(
                      "quick favor before i send your link. i don't make any money from this, it's free. if you want to support me, just don't unfollow after, and star the repo on github if it helps you. tap the button once you're following and i'll send it over"
                    )}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-none"
                    maxLength={1000}
                  />
                  <input
                    value={followPromptButtonLabel}
                    onChange={(e) => setFollowPromptButtonLabel(e.target.value)}
                    placeholder={t("i'm following")}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                    maxLength={20}
                  />
                </div>
              )}
            </div>

            {/* Main DM Content Box */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  {t("a DM with a link")}
                </label>
                {/* Dynamic Quick-Insert Chips */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => insertToken("{link}")}
                    className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent text-[11px] font-mono font-semibold hover:bg-accent/20 transition-colors"
                  >
                    + {"{link}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertToken("{username}")}
                    className="px-2 py-0.5 rounded-md bg-surface border border-border text-foreground/80 text-[11px] font-mono font-semibold hover:bg-surface-hover transition-colors"
                  >
                    + {"{username}"}
                  </button>
                </div>
              </div>

              <textarea
                value={dmMessage}
                onChange={(e) => setDmMessage(e.target.value)}
                placeholder={t("Write a message")}
                rows={3}
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-none transition-colors"
                maxLength={1000}
              />

              {/* Tracked Link Config */}
              {linkOpen ? (
                <div className="p-3.5 rounded-xl border border-border/80 bg-surface/70 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-xs font-bold text-foreground">Primary Destination Link</span>
                  </div>

                  <div className="grid sm:grid-cols-[1fr_160px] gap-2.5">
                    <input
                      value={trackedDestinationUrl}
                      onChange={(e) => setTrackedDestinationUrl(e.target.value)}
                      onBlur={ensureLinkToken}
                      placeholder="https://yourlink.com/offer"
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                    <input
                      value={linkButtonLabel}
                      onChange={(e) => setLinkButtonLabel(e.target.value)}
                      placeholder={t("Button label (e.g. Open link)")}
                      maxLength={20}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>

                  {/* Secondary Link Option */}
                  {secondLinkOpen ? (
                    <div className="pt-3 border-t border-border/60 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Secondary Link</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSecondLinkOpen(false);
                            setSecondaryDestinationUrl("");
                          }}
                          className="text-xs text-rose-400 hover:underline"
                        >
                          Remove second link
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-[1fr_160px] gap-2.5">
                        <input
                          value={secondaryDestinationUrl}
                          onChange={(e) => setSecondaryDestinationUrl(e.target.value)}
                          placeholder="https://yourlink.com/second"
                          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                        <input
                          value={secondaryButtonLabel}
                          onChange={(e) => setSecondaryButtonLabel(e.target.value)}
                          placeholder={t("Second button label")}
                          maxLength={20}
                          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSecondLinkOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t("+ Add A Second Link")}</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLinkOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-border hover:border-accent text-xs font-semibold text-muted hover:text-foreground transition-all flex items-center justify-center gap-2"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{t("+ Add A Link")}</span>
                </button>
              )}
            </div>
          </div>

          {/* STEP 4: Retention & Thank-You Follow-Up */}
          <div className="panel rounded-2xl p-5 sm:p-6 border border-border/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg gradient-instagram text-white text-xs font-bold shadow-xs">
                4
              </span>
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Automated Follow-Up Check-in
              </h2>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    {t("a follow-up thank-you message")}
                  </p>
                  <p className="text-[11px] text-muted">
                    {followUpDelayMinutes > 0
                      ? t("Sent {minutes} min after they tap through.", {
                          minutes: followUpDelayMinutes,
                        })
                      : t("Sent right after they tap through.")}
                  </p>
                </div>
                <Switch
                  checked={followUpEnabled}
                  onChange={() => setFollowUpEnabled(!followUpEnabled)}
                />
              </div>

              {followUpEnabled && (
                <div className="space-y-3 pt-2 border-t border-border/60 animate-fade-in">
                  <textarea
                    value={followUpMessage}
                    onChange={(e) => setFollowUpMessage(e.target.value)}
                    placeholder={t(
                      "Btw just wanted to say thanks for following me, I appreciate the support 🙌"
                    )}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-none"
                    maxLength={1000}
                  />

                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <span className="text-muted">{t("Send it")}</span>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={followUpDelayMinutes}
                      onChange={(e) =>
                        setFollowUpDelayMinutes(
                          Math.max(
                            0,
                            Math.min(1440, Math.floor(Number(e.target.value) || 0))
                          )
                        )
                      }
                      className="w-20 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs sm:text-sm text-foreground font-mono focus:border-accent focus:outline-none"
                    />
                    <span className="text-muted">{t("minutes after the link")}</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    {"{username}"} {t("personalizes it. Max 24 hours, to stay inside Instagram's messaging window.")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sticky Fixed iPhone Mockup Simulator */}
        <div className="lg:sticky lg:top-6 min-w-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Live Phone Simulation
            </span>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-time
            </span>
          </div>

          <div className="flex justify-center">
            <CampaignPreview
              tab={previewTab}
              onTabChange={setPreviewTab}
              username={username}
              avatarUrl={avatarUrl}
              postThumb={postThumb}
              caption={postCaption}
              sampleComment={deferredKeywords[0] ?? ""}
              dmTriggerEnabled={dmTriggerEnabled}
              publicReplyEnabled={publicReplyEnabled}
              publicReplyMessage={deferredPublicReplyMessages.find((m) => m.trim()) ?? ""}
              openingDmEnabled={openingDmEnabled}
              openingDmMessage={deferredOpeningDmMessage}
              openingDmButtonLabel={deferredOpeningDmButtonLabel}
              revealMessage={deferredDmMessage}
              hasLink={Boolean(deferredTrackedDestinationUrl.trim())}
              linkButtonLabel={deferredLinkButtonLabel || "Open link"}
              linkUrl={deferredTrackedDestinationUrl.trim() || undefined}
              hasSecondLink={
                secondLinkOpen && Boolean(deferredSecondaryDestinationUrl.trim())
              }
              secondLinkButtonLabel={deferredSecondaryButtonLabel || "Open link"}
              requireFollow={requireFollow}
              followPromptMessage={deferredFollowPromptMessage}
              followPromptButtonLabel={deferredFollowPromptButtonLabel || "i'm following"}
              followUpEnabled={followUpEnabled}
              followUpMessage={deferredFollowUpMessage}
              followUpDelayMinutes={followUpDelayMinutes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
