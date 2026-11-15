"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  MousePointerClick,
  Percent,
  AlertTriangle,
  SkipForward,
  Sparkles,
  Layers,
  Eye,
  Users,
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
}

function getIconForLabel(label: string) {
  const l = label.toLowerCase();
  if (l.includes("campaign")) return <Layers className="w-4 h-4 text-indigo-400" />;
  if (l.includes("sent") || l.includes("dm")) return <Send className="w-4 h-4 text-emerald-400" />;
  if (l.includes("click")) return <MousePointerClick className="w-4 h-4 text-sky-400" />;
  if (l.includes("ctr")) return <Percent className="w-4 h-4 text-violet-400" />;
  if (l.includes("skip")) return <SkipForward className="w-4 h-4 text-amber-400" />;
  if (l.includes("fail") || l.includes("error")) return <AlertTriangle className="w-4 h-4 text-rose-400" />;
  if (l.includes("reach") || l.includes("view")) return <Eye className="w-4 h-4 text-cyan-400" />;
  if (l.includes("follower") || l.includes("contact")) return <Users className="w-4 h-4 text-purple-400" />;
  return <Sparkles className="w-4 h-4 text-indigo-400" />;
}

export default function StatCard({ label, value, trend, trendUp, icon }: StatCardProps) {
  const renderedIcon = icon ?? getIconForLabel(label);

  return (
    <Card hover className="relative overflow-hidden p-4 sm:p-5 flex flex-col justify-between group">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none group-hover:bg-indigo-500/15 transition-all duration-300" />

      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs sm:text-sm font-medium text-muted truncate">{label}</span>
        <div className="shrink-0 p-2 rounded-xl bg-surface-elevated border border-white/10 group-hover:border-indigo-500/30 transition-colors">
          {renderedIcon}
        </div>
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
          {value}
        </span>

        {trend && (
          <Badge
            variant={trendUp ? "success" : "destructive"}
            size="sm"
            className="text-[10px] px-1.5 py-0"
          >
            {trend}
          </Badge>
        )}
      </div>
    </Card>
  );
}
