"use client";

/**
 * Modern Instagram Inbox & Messenger
 *
 * 2-pane interactive chat with real-time polling, optimistic UI updates,
 * authentic Instagram-styled chat bubbles, and 24-hour window countdown indicators.
 */

import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { useCallback, useEffect, useRef, useState } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import { readCache, writeCache } from "@/lib/client-cache";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { ConversationListItem } from "@/app/api/instagram/conversations/route";
import type { ThreadMessage } from "@/app/api/instagram/conversations/[id]/route";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

const POLL_MS = 12_000;
const CACHE_MAX_AGE_MS = 60_000;
const convCacheKey = (accountId: string) => `inbox:convs:${accountId}`;
const msgCacheKey = (conversationId: string) => `inbox:msgs:${conversationId}`;

function formatTime(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const { t, locale } = useI18n();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem("inbox:selectedAccount") ?? "";
  });

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationRequests = useRef(new Set<string>());

  const active = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.success) {
          setConvLoading(false);
          return;
        }
        const next: AccountOption[] = Array.isArray(payload.data?.instagramAccounts)
          ? payload.data.instagramAccounts
          : [];
        setAccounts(next);
        if (next.length === 0) {
          setConvLoading(false);
          return;
        }
        setSelectedAccountId((prev) => {
          const stillValid = prev && next.some((a) => a.id === prev);
          return stillValid
            ? prev
            : payload.data.selectedInstagramAccountId || next[0]?.id || "";
        });
      })
      .catch(() => {
        setAccounts([]);
        setConvLoading(false);
      })
      .finally(() => {
        setAccountsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedAccountId) return;
    window.sessionStorage.setItem("inbox:selectedAccount", selectedAccountId);
  }, [selectedAccountId]);

  const loadConversations = useCallback(
    async (silent: boolean) => {
      if (!selectedAccountId || conversationRequests.current.has(selectedAccountId)) {
        if (!silent) setConvLoading(false);
        return;
      }
      conversationRequests.current.add(selectedAccountId);
      if (!silent) setConvLoading(true);
      try {
        const res = await fetch(
          `/api/instagram/conversations?instagramAccountId=${selectedAccountId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.success) {
          const list: ConversationListItem[] = Array.isArray(data.data?.conversations)
            ? data.data.conversations
            : [];
          setConversations(list);
          writeCache(convCacheKey(selectedAccountId), list);
          setConvError(null);
        } else if (!silent) {
          setConvError(data.error ?? "Failed to load conversations");
        }
      } catch {
        if (!silent) setConvError("Failed to load conversations");
      } finally {
        conversationRequests.current.delete(selectedAccountId);
        if (!silent) setConvLoading(false);
      }
    },
    [selectedAccountId]
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!selectedAccountId) {
        setConvLoading(false);
        return;
      }
      setActiveId(null);
      setMessages([]);
      const cached = readCache<ConversationListItem[]>(
        convCacheKey(selectedAccountId),
        CACHE_MAX_AGE_MS
      );
      if (cached.data) {
        setConversations(cached.data);
        setConvLoading(false);
      } else {
        setConversations([]);
        setConvLoading(true);
      }
      void loadConversations(Boolean(cached.data));
    });
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void loadConversations(true);
    }, POLL_MS);

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadConversations(true);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [selectedAccountId, loadConversations]);

  const loadMessages = useCallback(
    async (conversationId: string, silent: boolean) => {
      if (!selectedAccountId) return;
      if (!silent) setThreadLoading(true);
      try {
        const res = await fetch(
          `/api/instagram/conversations/${conversationId}?instagramAccountId=${selectedAccountId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.success) {
          const msgList: ThreadMessage[] = Array.isArray(data.data?.messages)
            ? data.data.messages
            : [];
          setMessages(msgList);
          writeCache(msgCacheKey(conversationId), msgList);
        }
      } catch {
        // keep whatever is shown
      } finally {
        if (!silent) setThreadLoading(false);
      }
    },
    [selectedAccountId]
  );

  useEffect(() => {
    if (!activeId || active?.detailsUnavailable) return;
    const cached = readCache<ThreadMessage[]>(
      msgCacheKey(activeId),
      CACHE_MAX_AGE_MS
    );
    if (cached.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(cached.data);
      setThreadLoading(false);
    } else {
      setMessages([]);
      setThreadLoading(true);
    }
    void loadMessages(activeId, Boolean(cached.data));
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void loadMessages(activeId, true);
    }, POLL_MS);

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadMessages(activeId, true);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      window.clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [activeId, active?.detailsUnavailable, loadMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function openConversation(id: string) {
    setActiveId(id);
    setSendError(null);
    const cached = readCache<ThreadMessage[]>(msgCacheKey(id), CACHE_MAX_AGE_MS);
    setMessages(cached.data ?? []);
    setThreadLoading(!cached.data);
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || !active?.contact.id || sending) return;
    setSending(true);
    setSendError(null);

    const optimistic: ThreadMessage = {
      id: `optimistic-${Date.now()}`,
      text,
      fromMe: true,
      fromUsername: null,
      createdTime: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const res = await fetch("/api/instagram/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramAccountId: selectedAccountId,
          recipientId: active.contact.id,
          text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadMessages(active.id, true);
        void loadConversations(true);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
        setSendError(data.error ?? t("Failed to send message"));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
      setSendError(t("Failed to send message"));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
            {t("Inbox")}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Direct messaging console connected directly to your Instagram account.
          </p>
        </div>

        {accounts.length > 1 && (
          <AccountSelect
            accounts={accounts}
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            includeAll={false}
          />
        )}
      </div>

      {/* 2-Pane Messenger Canvas */}
      <div className="grid h-[calc(100dvh-12rem)] grid-cols-1 overflow-hidden rounded-2xl panel border-border/80 shadow-xl sm:grid-cols-[320px_1fr]">
        {/* Left: Conversation List */}
        <div
          className={`min-h-0 flex-col border-b border-border/80 sm:flex sm:border-b-0 sm:border-r bg-surface/90 ${
            active ? "hidden" : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-border/80 px-4 py-3.5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("Conversations")}
            </span>
            <Badge variant="secondary" size="sm" className="font-mono">
              {conversations.length}
            </Badge>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/40">
            {convLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-40 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : convError ? (
              <p className="px-4 py-8 text-xs text-rose-400 text-center">
                {convError === "Failed to load conversations" ? t("Failed to load conversations") : convError}
              </p>
            ) : !accountsLoading && accounts.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<MessageSquare className="w-5 h-5" />}
                  title={t("Connect Instagram")}
                  description={t("Connect an Instagram account first.")}
                  action={
                    <a href="/api/instagram/connect">
                      <Button variant="instagram" size="sm">
                        {t("Connect Instagram")}
                      </Button>
                    </a>
                  }
                />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<MessageSquare className="w-5 h-5" />}
                  title={t("No conversations yet.")}
                  description="When followers comment or reply to your automations, active threads appear here."
                />
              </div>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === activeId;
                const contactLetter = c.contact?.username?.[0] ?? "U";

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className={`block w-full px-4 py-3 text-left transition-all relative ${
                      isActive
                        ? "bg-accent/15 border-l-2 border-accent"
                        : "hover:bg-surface-hover/80"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-instagram text-white text-xs font-bold uppercase shadow-xs">
                        {contactLetter}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="truncate text-xs sm:text-sm font-bold text-foreground">
                            {c.detailsUnavailable ? t("Details unavailable") : `@${c.contact?.username ?? "unknown"}`}
                          </span>
                          <span className="shrink-0 text-[10px] font-mono text-muted">
                            {formatTime(c.updatedTime, locale)}
                          </span>
                        </div>

                        {c.detailsUnavailable && (
                          <p className="mt-0.5 text-[11px] text-amber-400">
                            {t("Instagram could not load this conversation.")}
                          </p>
                        )}

                        {c.lastMessage && (
                          <p className="mt-1 truncate text-xs text-muted">
                            <span className="font-medium text-foreground/80">
                              {c.lastMessage.fromMe ? t("You: ") : ""}
                            </span>
                            {c.lastMessage.text || t("(no text)")}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Thread */}
        <div className={`min-h-0 flex-col bg-surface/40 ${active ? "flex" : "hidden sm:flex"}`}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-border mb-3">
                <MessageSquare className="w-7 h-7 text-accent" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t("Select a conversation to read and reply.")}
              </p>
              <p className="text-xs text-muted mt-1 max-w-xs">
                Conversations are synced live from your Instagram messaging inbox.
              </p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-surface/90 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className="p-1 rounded-lg text-muted hover:text-foreground sm:hidden"
                    aria-label={t("Back to conversations")}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-instagram text-white text-xs font-bold uppercase shadow-xs">
                    {active.contact?.username?.[0] ?? "U"}
                  </div>

                  <div className="min-w-0">
                    <span className="truncate text-sm font-bold text-foreground block">
                      {active.detailsUnavailable ? t("Details unavailable") : `@${active.contact?.username ?? "unknown"}`}
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      Instagram Direct
                    </span>
                  </div>
                </div>

                {active.contact?.username && (
                  <a
                    href={`https://instagram.com/${active.contact.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-accent transition-colors"
                  >
                    <span>Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Messages Feed */}
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                {active.detailsUnavailable ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    {t("Instagram could not load the details of this conversation. Other conversations are still available. You can check this chat in Instagram.")}
                  </div>
                ) : threadLoading && messages.length === 0 ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-48 rounded-2xl ml-auto" />
                    <Skeleton className="h-12 w-56 rounded-2xl" />
                    <Skeleton className="h-16 w-64 rounded-2xl ml-auto" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-muted py-12">{t("No messages.")}</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.fromMe ? "justify-end" : "justify-start"} animate-scale-in`}
                    >
                      <div
                        className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                          m.fromMe
                            ? "gradient-instagram text-white"
                            : "bg-surface-elevated text-foreground border border-border/80"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>
                        <p
                          className={`mt-1 text-[10px] font-mono text-right ${
                            m.fromMe ? "text-white/80" : "text-muted"
                          }`}
                        >
                          {formatTime(m.createdTime, locale)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-border/80 bg-surface/90 p-3 sm:p-4">
                {sendError && (
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}
                <div className="flex items-end gap-2.5">
                  <textarea
                    disabled={active.detailsUnavailable || !active.contact?.id}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder={t("Write a reply…  (Enter to send, Shift+Enter for a new line)")}
                    className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
                  />
                  <Button
                    type="button"
                    variant="instagram"
                    onClick={() => void handleSend()}
                    loading={sending}
                    disabled={!draft.trim() || !active.contact?.id || active.detailsUnavailable}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    <span>{sending ? t("Sending…") : t("Send")}</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
