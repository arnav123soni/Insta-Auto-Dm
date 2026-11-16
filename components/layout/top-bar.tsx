"use client";

/**
 * Modern Top Bar
 *
 * Sticky glassmorphic header with page context, mobile trigger,
 * connected Instagram pill, and fast campaign creator CTA.
 */

import { useState, useRef, useEffect } from "react";
import type { StaticMessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, Plus, User, LogOut, ChevronDown } from "lucide-react";
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
  "/profile": "Profile",
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
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
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden shrink-0 p-2 sm:p-2 rounded-xl border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-hover transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
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
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {instagramAccountCount > 0 ? (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-surface-elevated/70 border border-white/10 text-xs text-foreground shadow-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-xs shrink-0">
              <InstagramIcon className="w-3 h-3" />
            </span>
            <span className="hidden sm:inline font-medium truncate max-w-[100px] md:max-w-[180px]">
              {instagramAccountCount > 1
                ? t("{count} accounts", { count: instagramAccountCount })
                : `@${instagramUsername}`}
            </span>
            <Badge variant="success" size="sm" dot pulse className="py-0 px-1 border-0" />
          </div>
        ) : (
          <a
            href="/api/instagram/connect"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-md shadow-pink-950/40 hover:opacity-95 transition-all"
          >
            <InstagramIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t("Connect Instagram")}</span>
            <span className="sm:hidden">{t("Connect")}</span>
          </a>
        )}

        {/* Quick New Campaign CTA */}
        {!isCreatingCampaign && (
          <Link href="/campaigns/new">
            <Button
              size="sm"
              variant="gradient"
              icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
              className="h-8 px-2 sm:px-3 min-w-[34px]"
            >
              <span className="hidden sm:inline">{t("New Campaign")}</span>
            </Button>
          </Link>
        )}

        {/* User Profile & Logout Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl border border-border/80 bg-surface hover:bg-surface-hover text-foreground transition-all focus:outline-none min-h-[36px] min-w-[36px] justify-center"
            aria-label="User menu"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white text-[10px] font-black">
              <User className="w-3.5 h-3.5" />
            </div>
            <ChevronDown className="w-3 h-3 text-muted" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface/95 border border-white/10 shadow-xl backdrop-blur-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <Link
                href="/profile"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-white/[0.06] transition min-h-[44px]"
              >
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>{t("Profile & Security")}</span>
              </Link>
              <div className="my-1 border-t border-border/50" />
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-950/30 transition text-left min-h-[44px]"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>{t("Sign Out")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
