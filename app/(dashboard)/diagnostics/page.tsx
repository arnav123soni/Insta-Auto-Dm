"use client";

/**
 * Modern Production Diagnostics & System Health Monitor
 *
 * Real-time worker heartbeat radar, BullMQ job vitals, failure streams,
 * and operational telemetry timeline.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RotateCw,
  Cpu,
  Layers,
  AlertTriangle,
  Radio,
  Clock,
  AlertCircle,
} from "lucide-react";

interface DiagnosticsData {
  queueCounts: Record<string, number>;
  workerHealth: {
    healthy: boolean;
    ageMs: number | null;
    heartbeat: {
      checkedAt: string;
      hostname?: string;
      pid: number;
      startedAt?: string;
    } | null;
  };
  workerAlerts: Array<{
    level: string;
    message: string;
    jobId?: string;
    commentId?: string;
    createdAt: string;
  }>;
  webhookFailures: Array<{
    id: string;
    object: string | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
  dmFailures: Array<{
    id: string;
    status: string;
    commentId: string;
    commentText: string;
    errorMessage: string | null;
    updatedAt: string;
    automation: { name: string };
  }>;
  tokenRefreshFailures: Array<{
    id: string;
    message: string;
    createdAt: string;
  }>;
  operationalEvents: Array<{
    id: string;
    source: string;
    level: string;
    message: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-xs text-muted bg-surface-hover/20 rounded-xl border border-dashed border-border/80">
      <p>{label}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel rounded-2xl p-5 sm:p-6 border border-border/80 shadow-md">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-sm font-bold text-foreground tracking-tight">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function DiagnosticsPage() {
  const { t, label, locale } = useI18n();
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshDiagnostics() {
    setLoading(true);
    const response = await fetch("/api/admin/diagnostics");
    const payload = await response.json();
    if (payload.success) {
      setData(payload.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialDiagnostics() {
      const response = await fetch("/api/admin/diagnostics");
      const payload = await response.json();
      if (active && payload.success) {
        setData(payload.data);
      }
      if (active) {
        setLoading(false);
      }
    }

    void loadInitialDiagnostics();

    return () => {
      active = false;
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const workerAgeSeconds =
    data?.workerHealth.ageMs == null
      ? null
      : Math.round(data.workerHealth.ageMs / 1000);

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
              {t("Production Diagnostics")}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-muted">
            {t("Health, queues, webhook failures, billing events, and worker alerts.")}
          </p>
        </div>

        <button
          onClick={() => void refreshDiagnostics()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-surface-hover hover:border-accent/40 shadow-xs"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{t("Refresh")}</span>
        </button>
      </div>

      {/* Vitals Grid (Worker + Queue Counts) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
        {/* Worker Heartbeat Card */}
        <div className="panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between border-border/80 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              {t("Worker health")}
            </span>
            <div className="p-1 rounded-lg bg-surface-hover">
              <Cpu className="w-3.5 h-3.5 text-accent" />
            </div>
          </div>
          <p
            className={`mt-2 text-xl sm:text-2xl font-bold tracking-tight ${
              data?.workerHealth.healthy ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {data?.workerHealth.healthy ? t("Healthy") : t("Needs attention")}
          </p>
          <p className="mt-1 text-[11px] font-mono text-muted">
            {workerAgeSeconds == null
              ? t("No heartbeat found")
              : t("Last heartbeat {seconds}s ago", { seconds: workerAgeSeconds })}
          </p>
        </div>

        {/* Queues: Waiting, Active, Delayed, Failed */}
        {["waiting", "active", "delayed", "failed"].map((key) => {
          const count = data?.queueCounts[key] ?? 0;
          const isFailed = key === "failed" && count > 0;
          return (
            <div
              key={key}
              className={`panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between border-border/80 ${
                isFailed ? "border-rose-500/30 bg-rose-500/5" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  {t("Queue")} {label(key)}
                </span>
                <Layers className="w-3.5 h-3.5 text-muted" />
              </div>
              <p
                className={`mt-2 text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                  isFailed ? "text-rose-400" : "text-foreground"
                }`}
              >
                {count}
              </p>
              <p className="mt-1 text-[11px] text-muted capitalize">BullMQ status</p>
            </div>
          );
        })}
      </div>

      {/* Worker Alerts Section */}
      <Section
        title={t("Recent Worker Alerts")}
        icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
      >
        {data?.workerAlerts.length ? (
          <div className="space-y-3">
            {data.workerAlerts.map((alert) => (
              <div
                key={`${alert.createdAt}-${alert.jobId ?? alert.message}`}
                className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 flex-1 break-words text-xs sm:text-sm font-semibold text-foreground">
                    {alert.message}
                  </p>
                  <span className="shrink-0 rounded-full bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
                    {alert.level}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-mono text-muted">
                  {formatDate(alert.createdAt, locale)}
                  {alert.commentId ? ` · ${alert.commentId}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label={t("No worker alerts recorded.")} />
        )}
      </Section>

      {/* DM Failures & Webhook Failures */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title={t("Campaign DM Failures And Skips")}
          icon={<AlertCircle className="w-4 h-4 text-rose-400" />}
        >
          {data?.dmFailures.length ? (
            <div className="space-y-3 divide-y divide-border/60">
              {data.dmFailures.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 truncate text-xs sm:text-sm font-semibold text-foreground">
                      {item.automation.name}
                    </p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    &ldquo;{item.commentText}&rdquo;
                  </p>
                  {item.errorMessage && (
                    <p className="mt-1 text-xs text-rose-400 font-mono">{item.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label={t("No DM failures or skips.")} />
          )}
        </Section>

        <Section
          title={t("Webhook Failures")}
          icon={<Radio className="w-4 h-4 text-amber-400" />}
        >
          {data?.webhookFailures.length ? (
            <div className="space-y-3 divide-y divide-border/60">
              {data.webhookFailures.map((event) => (
                <div key={event.id} className="pt-3 first:pt-0">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    {event.object ?? t("Instagram webhook")}
                  </p>
                  <p className="mt-1 text-xs text-rose-400 font-mono">
                    {event.errorMessage ?? t("Unknown error")}
                  </p>
                  <p className="mt-1 text-[11px] text-muted font-mono">
                    {formatDate(event.createdAt, locale)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label={t("No failed webhook events.")} />
          )}
        </Section>
      </div>

      {/* Operational Events Timeline */}
      <Section
        title={t("Operational Event Timeline")}
        icon={<Clock className="w-4 h-4 text-accent" />}
      >
        {data?.operationalEvents.length ? (
          <div className="space-y-3 divide-y divide-border/60">
            {data.operationalEvents.map((event) => (
              <div
                key={event.id}
                className="grid gap-2 pt-3 first:pt-0 sm:grid-cols-[140px_1fr_auto]"
              >
                <p className="text-xs font-semibold text-accent">{event.source}</p>
                <p className="text-xs sm:text-sm text-foreground">{event.message}</p>
                <p className="text-[11px] font-mono text-muted">{formatDate(event.createdAt, locale)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label={t("No operational events recorded.")} />
        )}
      </Section>
    </div>
  );
}
