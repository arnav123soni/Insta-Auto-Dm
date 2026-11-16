"use client";

/**
 * Modern Sidebar Navigation
 *
 * Polished glassmorphic sidebar with icons, active state pill, and workspace status.
 */

import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  BarChart3,
  Inbox,
  Megaphone,
  ScrollText,
  Settings,
  User,
  Activity,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Overview", href: "/overview", icon: BarChart3 },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "DM Logs", href: "/logs", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Diagnostics", href: "/diagnostics", icon: Activity },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  workspaceName,
}: SidebarProps) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-dvh w-64 max-w-[85vw] shrink-0 bg-surface/95 border-r border-border/80 flex flex-col
          backdrop-blur-xl transition-transform duration-300 ease-out
          lg:h-full lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
      >
        {/* Brand Header */}
        <div
          className="px-5 py-4 border-b border-border/60 flex items-center justify-between"
          style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
        >
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 group focus:outline-none min-w-0"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform duration-200 ring-1 ring-white/10 bg-black/40">
              <Image
                src="/brand/icon-mark.png"
                alt="InstaReply"
                fill
                sizes="36px"
                className="object-cover"
              />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 z-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5 truncate">
                InstaReply
                <Badge variant="indigo" size="sm" className="px-1.5 py-0 uppercase text-[9px] font-bold tracking-wider">
                  Pro
                </Badge>
              </span>
              <span className="text-[11px] text-muted font-medium truncate">Instagram Auto-DM</span>
            </div>
          </Link>

          {/* Close drawer button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.08] transition min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label={t("Close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={`
                  group flex items-center gap-3 px-3.5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]
                  ${
                    isActive
                      ? "bg-accent/15 text-white font-semibold shadow-xs border border-accent/25 relative"
                      : "text-muted hover:text-foreground hover:bg-surface-hover/80 hover:translate-x-1"
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-accent" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? "text-accent"
                      : "text-muted group-hover:text-foreground"
                  }`}
                />
                <span className="truncate">{t(item.label)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Workspace Card & Status Footer */}
        <div
          className="p-4 border-t border-border/60 bg-surface-hover/30"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mb-3">
            <LanguageSwitcher />
          </div>

          <div className="p-3.5 rounded-xl bg-surface/90 border border-white/[0.08] shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                {workspaceName}
              </span>
              <Badge variant="success" size="sm" dot pulse className="py-0.5 px-2">
                Live
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
              <span>Engine Status</span>
              <span className="text-foreground/90 font-mono font-medium">Meta v25.0</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
