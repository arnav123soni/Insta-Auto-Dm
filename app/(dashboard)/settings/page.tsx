"use client";

/**
 * Modern Settings & Workspace Management Page
 *
 * Instagram connection status, webhook subscriptions, team invitation hub,
 * and monthly delivery volume usage metrics.
 */

import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import { Suspense, useEffect, useState } from "react";
import type { AccountOption } from "@/components/account-select";
import { InstagramConnectNotice } from "@/components/instagram-connect-notice";
import { TesterOnboardingWizard } from "@/components/onboarding/tester-onboarding-wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Globe,
  Users,
  Copy,
  Check,
  Plus,
} from "lucide-react";

interface SettingsData {
  workspace: {
    name: string;
    dmsSentThisPeriod: number;
  };
  instagramAccount: {
    id: string;
    username: string;
    instagramId: string;
    tokenExpiresAt: string | null;
    webhookSubscribed: boolean;
  } | null;
  instagramAccounts: Array<
    AccountOption & {
      provider?: "META" | "ZERNIO";
      tokenExpiresAt: string | null;
      webhookSubscribed: boolean;
    }
  >;
}

interface WorkspaceMembersData {
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  members: Array<{
    id: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    createdAt: string;
    user: {
      id: string;
      email: string | null;
      name: string | null;
    };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    inviteUrl: string;
    expiresAt: string;
  }>;
}

export default function SettingsPage() {
  const { t, label, locale } = useI18n();
  const [data, setData] = useState<SettingsData | null>(null);
  const [membersData, setMembersData] = useState<WorkspaceMembersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((res) => res.json()),
      fetch("/api/workspace/members").then((res) => res.json()),
    ])
      .then(([statsPayload, membersPayload]) => {
        if (statsPayload.success) setData(statsPayload.data);
        if (membersPayload.success) setMembersData(membersPayload.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function refreshMembers() {
    const res = await fetch("/api/workspace/members");
    const payload = await res.json();
    if (payload.success) setMembersData(payload.data);
  }

  async function disconnectInstagram(instagramAccountId: string) {
    if (!confirm(t("Disconnect Instagram? Campaigns for this account will stop sending DMs."))) {
      return;
    }

    setBusy(`disconnect:${instagramAccountId}`);
    await fetch("/api/instagram/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagramAccountId }),
    });
    window.location.reload();
  }

  async function inviteMember(event: React.FormEvent) {
    event.preventDefault();
    setMemberError(null);
    setBusy("invite");
    const res = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const payload = await res.json();
    if (payload.success) {
      setMembersData(payload.data);
      setInviteEmail("");
    } else {
      setMemberError(payload.error ?? t("Could not invite member"));
    }
    setBusy(null);
  }

  async function removeInvitation(invitationId: string) {
    setBusy(`invite:${invitationId}`);
    await fetch("/api/workspace/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    await refreshMembers();
    setBusy(null);
  }

  function copyInvite(id: string, url: string) {
    void navigator.clipboard?.writeText(url);
    setCopiedInviteId(id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const accounts = data?.instagramAccounts ?? [];
  const canManageMembers =
    membersData?.currentUserRole === "OWNER" ||
    membersData?.currentUserRole === "ADMIN";

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <Suspense fallback={null}>
        <InstagramConnectNotice />
      </Suspense>

      {/* Language Switcher Card */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-foreground tracking-tight">
            {t("Interface language")}
          </h2>
        </div>
        <LanguageSwitcher />
        <p className="text-xs text-muted mt-2">
          {t("Saved in this browser. Campaign messages stay unchanged.")}
        </p>
      </Card>

      <TesterOnboardingWizard />

      {/* Instagram Connection Section */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              {t("Instagram Connection")}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {t("Comment webhooks and private replies depend on this connection.")}
            </p>
          </div>

          <Badge
            variant={accounts.length > 0 ? "success" : "warning"}
            size="sm"
            dot
            pulse={accounts.length > 0}
          >
            {accounts.length > 0 ? t("Connected") : t("Not connected")}
          </Badge>
        </div>

        {/* Connected Accounts List */}
        <div className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-xs text-muted py-6 text-center bg-surface-hover/30 rounded-xl border border-dashed border-border">
              {t("Connect an Instagram professional account to launch campaigns.")}
            </p>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface-hover/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-instagram text-white font-bold uppercase shadow-xs">
                    {account.username[0] ?? "I"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      @{account.username}
                    </p>
                    <p className="text-xs text-muted flex flex-wrap items-center gap-1.5 mt-0.5">
                      {account.provider === "ZERNIO" ? (
                        <span>{t("Connected via Zernio")}</span>
                      ) : (
                        <span>
                          {t("Token expires")}{" "}
                          {account.tokenExpiresAt
                            ? new Date(account.tokenExpiresAt).toLocaleDateString(locale)
                            : t("not available")}
                        </span>
                      )}
                      <span>·</span>
                      <span className={account.webhookSubscribed ? "text-emerald-400 font-medium" : "text-amber-400"}>
                        {account.webhookSubscribed ? t("Webhook ready") : t("Webhook pending")}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => disconnectInstagram(account.id)}
                  disabled={busy === `disconnect:${account.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-500/20 px-3.5 py-1.5 text-xs font-semibold text-rose-400 transition-all hover:bg-rose-500/10 disabled:opacity-50"
                >
                  {busy === `disconnect:${account.id}`
                    ? t("Disconnecting...")
                    : t("Disconnect")}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-border/80 flex">
          <a
            href="/api/instagram/connect"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-instagram text-xs font-semibold text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("Connect using your own Meta app")}</span>
          </a>
        </div>
      </Card>

      {/* Team Members Section */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold text-foreground tracking-tight">
              {t("Team")}
            </h2>
          </div>
          <Badge variant="secondary" size="sm" className="font-mono">
            {membersData?.members.length ?? 0} {t("Member")}s
          </Badge>
        </div>

        <div className="space-y-2.5 divide-y divide-border/50">
          {membersData?.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 pt-2.5 first:pt-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover border border-border text-foreground font-bold text-xs uppercase">
                  {(member.user.name?.[0] ?? member.user.email?.[0] ?? "U")}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs sm:text-sm font-semibold text-foreground">
                    {member.user.name ?? member.user.email ?? t("Unknown member")}
                  </p>
                  <p className="text-[11px] text-muted truncate">{member.user.email}</p>
                </div>
              </div>

              <span className="rounded-full border border-border/80 bg-surface-hover px-2.5 py-0.5 text-[11px] font-semibold text-muted shrink-0">
                {label(member.role)}
              </span>
            </div>
          ))}
        </div>

        {/* Pending Invitations */}
        {membersData?.invitations.length ? (
          <div className="mt-6 border-t border-border/80 pt-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
              {t("Pending invites")}
            </p>
            <div className="space-y-2.5">
              {membersData.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-2.5 rounded-xl border border-border/80 bg-surface-hover/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">
                      {invitation.email}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {label(invitation.role)} · {invitation.inviteUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyInvite(invitation.id, invitation.inviteUrl)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors"
                    >
                      {copiedInviteId === invitation.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">{t("Copied!")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{t("Copy")}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeInvitation(invitation.id)}
                      disabled={busy === `invite:${invitation.id}`}
                      className="rounded-lg border border-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                    >
                      {t("Revoke")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Invite Form */}
        {canManageMembers && (
          <form
            onSubmit={inviteMember}
            className="mt-6 grid gap-2.5 border-t border-border/80 pt-5 sm:grid-cols-[1fr_130px_auto]"
          >
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@agency.com"
              className="rounded-xl border border-border bg-surface px-3.5 py-2 text-xs sm:text-sm text-foreground outline-none transition-colors focus:border-accent"
              required
            />
            <select
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value as "ADMIN" | "MEMBER")
              }
              className="rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground outline-none transition-colors focus:border-accent"
            >
              <option value="MEMBER">{t("Member")}</option>
              <option value="ADMIN">{t("Admin")}</option>
            </select>
            <button
              type="submit"
              disabled={busy === "invite"}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-50 shadow-sm"
            >
              {busy === "invite" ? t("Inviting...") : t("Invite")}
            </button>
            {memberError && (
              <p className="sm:col-span-3 text-xs text-rose-400">{memberError}</p>
            )}
          </form>
        )}
      </Card>

      {/* Usage Section */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold text-foreground tracking-tight mb-4">
          {t("Usage")}
        </h2>
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-elevated/40 border border-white/[0.06]">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("DMs sent this month")}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {t("Self-hosted — no plan limits.")}
            </p>
          </div>
          <span className="text-xl font-bold font-mono text-emerald-400">
            {data?.workspace.dmsSentThisPeriod ?? 0}
          </span>
        </div>
      </Card>
    </div>
  );
}
