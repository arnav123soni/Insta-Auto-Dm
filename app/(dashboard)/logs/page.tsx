"use client";

/**
 * Modern DM Logs Audit Page
 *
 * Filterable, paginated audit trail of automated DMs with commenter
 * handles, automation tags, status badges, and error diagnostics.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState, useCallback } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import StatusBadge from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ScrollText,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  User,
} from "lucide-react";

interface DmLog {
  id: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  automation: { name: string; keywords: string[] };
  instagramAccount: { username: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_FILTERS = [
  "ALL",
  "SENT",
  "FAILED",
  "PENDING",
  "SKIPPED_RATE_LIMIT",
  "SKIPPED_PLAN_LIMIT",
  "SKIPPED_DEDUP",
];

export default function LogsPage() {
  const { t, label, locale } = useI18n();
  const [logs, setLogs] = useState<DmLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (selectedAccountId !== "all") {
        params.set("instagramAccountId", selectedAccountId);
      }

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, selectedAccountId]);

  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) setAccounts(payload.data.instagramAccounts ?? []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLogs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLogs]);

  function handleFilterChange(status: string) {
    setLoading(true);
    setStatusFilter(status);
    setPage(1);
  }

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
    setPage(1);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
              {t("DM Logs")}
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface border border-border text-muted">
              {pagination?.total ?? 0}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Audit trail of every comment processed, keyword matched, and private DM delivered.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {accounts.length > 1 && (
            <AccountSelect
              accounts={accounts}
              value={selectedAccountId}
              onChange={handleAccountChange}
            />
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoading(true);
              void fetchLogs();
            }}
            icon={<RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            aria-label={t("Refresh")}
          >
            <span>{t("Refresh")}</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-surface-elevated/40 border border-white/[0.06] w-fit">
        {STATUS_FILTERS.map((status) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => handleFilterChange(status)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs font-semibold"
                    : "text-muted hover:text-foreground hover:bg-white/[0.04]"
                }
              `}
            >
              {label(status)}
            </button>
          );
        })}
      </div>

      {/* Modern Data Table */}
      <Card className="overflow-hidden border border-white/[0.08] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-surface-hover/50 text-muted font-bold text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3.5 sm:px-6">{t("Commenter")}</th>
                <th className="px-5 py-3.5 sm:px-6">{t("Comment")}</th>
                <th className="px-5 py-3.5 sm:px-6">{t("Campaign")}</th>
                <th className="px-5 py-3.5 sm:px-6">{t("Account")}</th>
                <th className="px-5 py-3.5 sm:px-6">{t("Status")}</th>
                <th className="px-5 py-3.5 sm:px-6">{t("Time")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-5 py-4 sm:px-6">
                        <Skeleton className="h-5 w-full rounded-md" />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      icon={<ScrollText className="w-5 h-5" />}
                      title={t("No logs found")}
                      description="Trigger comments on your Instagram posts will show up here automatically."
                    />
                  </td>
                </tr>
              )}

              {!loading &&
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-surface-hover/60 transition-colors group"
                  >
                    {/* Commenter */}
                    <td className="px-5 py-3.5 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 border border-accent/25 text-accent text-xs font-bold uppercase">
                          {log.commenterName?.[0] ?? <User className="w-3.5 h-3.5" />}
                        </div>
                        <span className="font-semibold text-foreground truncate max-w-[140px]">
                          @{log.commenterName ?? log.commenterId.slice(0, 8)}
                        </span>
                      </div>
                    </td>

                    {/* Comment */}
                    <td className="px-5 py-3.5 max-w-[220px] sm:px-6">
                      <span className="text-foreground/90 truncate block font-medium">
                        &ldquo;{log.commentText}&rdquo;
                      </span>
                      {log.errorMessage && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 mt-0.5 truncate block">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {log.errorMessage}
                        </span>
                      )}
                    </td>

                    {/* Campaign */}
                    <td className="px-5 py-3.5 sm:px-6">
                      <span className="font-medium text-foreground truncate block max-w-[160px]">
                        {log.automation.name}
                      </span>
                    </td>

                    {/* Account */}
                    <td className="px-5 py-3.5 sm:px-6">
                      <span className="text-xs font-mono text-muted">
                        @{log.instagramAccount.username}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5 sm:px-6">
                      <StatusBadge status={log.status} />
                    </td>

                    {/* Time */}
                    <td className="px-5 py-3.5 text-xs text-muted whitespace-nowrap sm:px-6 font-mono">
                      {new Date(log.createdAt).toLocaleString(locale, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-white/[0.06] bg-surface sm:px-6">
            <p className="text-xs text-muted font-medium">
              {t("Showing {start}–{end} of {total}", {
                start: (pagination.page - 1) * pagination.limit + 1,
                end: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage(page - 1);
                }}
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                <span>{t("Previous")}</span>
              </Button>

              <Badge variant="outline" size="sm" className="font-mono px-2.5">
                {page} / {pagination.totalPages}
              </Badge>

              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => {
                  setLoading(true);
                  setPage(page + 1);
                }}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                <span>{t("Next")}</span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
