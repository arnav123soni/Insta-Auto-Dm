import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "gradient"
    | "instagram";
  size?: "xs" | "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950/50 hover:shadow-indigo-600/25 active:bg-indigo-700",
  secondary:
    "bg-surface-elevated hover:bg-surface-hover text-foreground border border-white/10 hover:border-white/20 active:bg-surface",
  outline:
    "border border-white/15 bg-transparent hover:bg-white/[0.06] text-foreground hover:border-white/25",
  ghost:
    "bg-transparent hover:bg-white/[0.08] text-muted hover:text-foreground active:bg-white/[0.12]",
  destructive:
    "bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-950/50 active:bg-rose-700",
  gradient:
    "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-950/40 hover:opacity-95 active:opacity-90",
  instagram:
    "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-md shadow-pink-950/30 hover:opacity-95 active:opacity-90",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg font-medium",
  md: "h-9 px-4 text-sm gap-2 rounded-lg font-medium",
  lg: "h-11 px-5 text-base gap-2.5 rounded-xl font-medium",
  icon: "h-9 w-9 p-0 rounded-lg justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      icon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
