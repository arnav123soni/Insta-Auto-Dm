"use client";

import type { StaticMessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";

interface StatusStyle {
  pill: string;
  dot: string;
  label: StaticMessageKey;
  animateDot?: boolean;
}

const statusConfig: Record<string, StatusStyle> = {
  SENT: {
    pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    dot: "bg-emerald-400",
    label: "Sent",
  },
  FAILED: {
    pill: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    dot: "bg-rose-400",
    label: "Failed",
  },
  PENDING: {
    pill: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    dot: "bg-amber-400",
    label: "Pending",
    animateDot: true,
  },
  SKIPPED_DEDUP: {
    pill: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    dot: "bg-slate-400",
    label: "Dedup",
  },
  SKIPPED_RATE_LIMIT: {
    pill: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    dot: "bg-amber-400",
    label: "Rate limited",
  },
  SKIPPED_PLAN_LIMIT: {
    pill: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    dot: "bg-amber-400",
    label: "Skipped",
  },
  SKIPPED_NO_MATCH: {
    pill: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    dot: "bg-slate-400",
    label: "No match",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const { t } = useI18n();
  const config = statusConfig[status] ?? statusConfig.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 whitespace-nowrap shadow-xs ${config.pill} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dot} ${
          config.animateDot ? "animate-ping" : ""
        }`}
      />
      <span>{t(config.label)}</span>
    </span>
  );
}
