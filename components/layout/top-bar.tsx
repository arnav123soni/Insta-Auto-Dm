"use client";

/**
 * Modern Top Bar
 *
 * Sticky glassmorphic header with page context, mobile trigger,
 * connected Instagram pill, and fast campaign creator CTA.
 */

import type { StaticMessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function InstagramIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const pageTitles: Record<string, StaticMessageKey> = {
  "/dashboard": "Dashboard",
  "/overview": "Overview",
  "/inbox": "Inbox",
  "/campaigns/import": "Import campaigns",
  "/campaigns": "Campaigns",
  "/campaigns/new": "New Campaign",
  "/automations": "Campaigns",
  "/automations/new": "New Campaign",
  "/logs": "DM Logs",
  "/settings": "Settings",
  "/diagnostics": "Diagnostics",
};

interface TopBarProps {
  onMenuClick: () => void;
  instagramUsername: string | null;
  instagramAccountCount: number;
}

export default function TopBar({
  onMenuClick,
  instagramUsername,
  instagramAccountCount,
}: TopBarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const title: StaticMessageKey =
    pageTitles[pathname] ??
    (pathname.endsWith("/edit")
      ? "Edit campaign"
      : pathname.startsWith("/campaigns/")
      ? "Campaign details"
      : "Dashboard");

  const isCreatingCampaign = pathname === "/campaigns/new";

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 lg:px-8 border-b border-border/70 bg-background/80 backdrop-blur-xl transition-all"
      style={{
        height: "calc(4rem + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden shrink-0 p-2 rounded-xl border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          aria-label={t("Toggle sidebar")}
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="truncate text-base font-bold sm:text-lg text-foreground tracking-tight">
            {t(title)}
          </h1>
        </div>
      </div>

      {/* Right: Account status & Primary Action */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {instagramAccountCount > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/70 border border-white/10 text-xs text-foreground shadow-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-xs">
              <InstagramIcon className="w-3 h-3" />
            </span>
            <span className="font-medium truncate max-w-[120px] sm:max-w-[180px]">
              {instagramAccountCount > 1
                ? t("{count} accounts", { count: instagramAccountCount })
                : `@${instagramUsername}`}
            </span>
            <Badge variant="success" size="sm" dot pulse className="py-0 px-1 border-0" />
          </div>
        ) : (
          <a
            href="/api/instagram/connect"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-md shadow-pink-950/40 hover:opacity-95 transition-all"
          >
            <InstagramIcon className="w-3.5 h-3.5" />
            <span className="sm:hidden">{t("Connect")}</span>
            <span className="hidden sm:inline">{t("Connect Instagram")}</span>
          </a>
        )}

        {/* Quick New Campaign CTA */}
        {!isCreatingCampaign && (
          <Link href="/campaigns/new">
            <Button
              size="sm"
              variant="gradient"
              icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
            >
              <span>{t("New Campaign")}</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
