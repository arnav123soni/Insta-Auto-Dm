import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "outline"
    | "indigo"
    | "instagram";
  size?: "sm" | "md";
  dot?: boolean;
  pulse?: boolean;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-surface-elevated text-foreground border-white/10",
  secondary: "bg-white/[0.06] text-muted hover:bg-white/[0.1] border-transparent",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  destructive: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  outline: "border-white/15 text-foreground bg-transparent",
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  instagram:
    "bg-gradient-to-tr from-[#f09433]/15 via-[#dc2743]/15 to-[#bc1888]/15 text-pink-400 border-pink-500/20",
};

const dotColors: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-muted",
  secondary: "bg-muted-foreground",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  destructive: "bg-rose-400",
  outline: "bg-foreground",
  indigo: "bg-indigo-400",
  instagram: "bg-pink-400",
};

export function Badge({
  className,
  variant = "default",
  size = "md",
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border rounded-full select-none",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                dotColors[variant]
              )}
            />
          )}
          <span
            className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColors[variant])}
          />
        </span>
      )}
      {children}
    </span>
  );
}
