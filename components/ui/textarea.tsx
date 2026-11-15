import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
  showCount?: boolean;
  maxLength?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, showCount, maxLength, value, defaultValue, disabled, ...props }, ref) => {
    const currentLength =
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
        ? defaultValue.length
        : 0;

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          className={cn(
            "flex min-h-[80px] w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/60 transition-all duration-150",
            "border-white/10 hover:border-white/20",
            "focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface/50 resize-y",
            Boolean(error) && "border-rose-500/80 focus-visible:border-rose-500 focus-visible:ring-rose-500",
            className
          )}
          {...props}
        />
        {showCount && typeof maxLength === "number" && (
          <div className="mt-1 flex justify-end text-[11px] text-muted">
            <span
              className={cn(
                currentLength >= maxLength ? "text-rose-400 font-semibold" : "text-muted"
              )}
            >
              {currentLength}
            </span>
            <span className="text-muted/60">/{maxLength}</span>
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
