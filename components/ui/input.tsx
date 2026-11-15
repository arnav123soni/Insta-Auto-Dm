import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: boolean | string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, rightElement, error, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-muted shrink-0">
            {icon}
          </div>
        )}
        <input
          type={type}
          disabled={disabled}
          ref={ref}
          className={cn(
            "flex h-9.5 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/60 transition-all duration-150",
            "border-white/10 hover:border-white/20",
            "focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface/50",
            Boolean(icon) && "pl-9",
            Boolean(rightElement) && "pr-9",
            Boolean(error) && "border-rose-500/80 focus-visible:border-rose-500 focus-visible:ring-rose-500",
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center text-muted">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
