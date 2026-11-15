import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`shimmer rounded-md bg-surface-hover/80 ${className}`}
      {...props}
    />
  );
}
