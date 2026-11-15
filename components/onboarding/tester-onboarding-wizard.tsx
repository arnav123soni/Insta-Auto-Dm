"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/provider";

interface TesterAccount {
  id: string;
  username: string;
  onboardingStatus: "PENDING_INVITE" | "INVITE_SENT" | "INVITE_ACCEPTED" | "ACTIVE";
  inviteSentAt: string | null;
  inviteAcceptedAt: string | null;
}

export function TesterOnboardingWizard({
  onConnected,
}: {
  onConnected?: () => void;
} = {}) {
  const { t } = useI18n();
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<TesterAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/instagram/tester-request")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && payload.data) {
          setAccount(payload.data);
          setHandle(payload.data.username);
          if (payload.data.onboardingStatus === "ACTIVE") {
            onConnected?.();
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onConnected]);

  async function handleSubmitHandle(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/instagram/tester-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await res.json();
      if (data.success) {
        setAccount(data.data);
      } else {
        setError(data.error ?? "Failed to submit Instagram handle.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="panel rounded p-6 animate-pulse h-48" />;
  }

  // If already active, show success banner
  if (account?.onboardingStatus === "ACTIVE") {
    return (
      <div className="panel rounded p-6 border-l-4 border-success bg-surface/80">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success font-bold">
            ✓
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              @{account.username} {t("Connected")}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {t("Comment webhooks and private replies depend on this connection.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel rounded p-6 border border-accent/30 bg-surface/95 shadow-sm space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-accent/10 text-accent mb-2">
            ✨ Easy 2-Minute Instagram Connection
          </span>
          <h3 className="text-base font-semibold text-foreground">
            {t("Connect your Instagram account first")}
          </h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {t("Connect an Instagram professional account to launch campaigns.")}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded bg-error/10 border border-error/20 p-3 text-xs text-error">
          {error}
        </div>
      )}

      {/* Step 1: Submit Instagram Handle */}
      {!account || account.onboardingStatus === "PENDING_INVITE" ? (
        <form onSubmit={handleSubmitHandle} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="ig-handle" className="block text-xs font-medium text-foreground">
              {t("Instagram account")}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted font-medium">
                @
              </span>
              <input
                id="ig-handle"
                type="text"
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourhandle"
                className="w-full pl-8 pr-4 py-2.5 rounded bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:border-accent/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-indigo-500/20 hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : account
              ? "Update Instagram handle"
              : "Continue to Step 2"}
          </button>
        </form>
      ) : null}

      {/* Step 2 & 3: Interactive Visual Instructions */}
      {account && (
        <div className="pt-2 border-t border-border/60 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Next Steps for @{account.username}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded bg-surface/80 border border-border/80 p-3.5 space-y-1.5">
              <span className="font-semibold text-accent flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px]">
                  1
                </span>
                Accept on Mobile App
              </span>
              <p className="text-muted leading-relaxed">
                Open Instagram on phone → Settings & activity → Website permissions → Tester invites → Tap Accept.
              </p>
            </div>

            <div className="rounded bg-surface/80 border border-border/80 p-3.5 space-y-1.5">
              <span className="font-semibold text-accent flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px]">
                  2
                </span>
                Finalize Connection
              </span>
              <p className="text-muted leading-relaxed">
                After tapping Accept in Instagram, click the button below to authorize automations.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <a
              href="/api/instagram/connect"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-indigo-500/25 hover:bg-accent-hover transition-all"
            >
              {t("Connect using your own Meta app")} ↗
            </a>
            <button
              type="button"
              onClick={() => setAccount(null)}
              className="px-4 py-2.5 rounded border border-border text-xs text-muted hover:text-foreground transition-colors"
            >
              Change @username
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
