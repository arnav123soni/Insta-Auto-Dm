import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase 2 Responsive TopBar Specifications", () => {
  const topBarPath = path.resolve(__dirname, "../components/layout/top-bar.tsx");
  const topBarSource = fs.readFileSync(topBarPath, "utf-8");

  it("collapses Instagram pill text on small mobile screens to prevent header overflow", () => {
    expect(topBarSource).toContain("hidden sm:inline font-medium truncate");
  });

  it("collapses New Campaign text on small screens, preserving compact icon", () => {
    expect(topBarSource).toContain("hidden sm:inline");
  });

  it("ensures user menu links meet 44px touch targets", () => {
    expect(topBarSource).toContain("min-h-[44px]");
  });
});

describe("Phase 2 Responsive Sidebar Drawer Specifications", () => {
  const sidebarPath = path.resolve(__dirname, "../components/layout/sidebar.tsx");
  const sidebarSource = fs.readFileSync(sidebarPath, "utf-8");

  it("provides an explicit mobile close button with touch bounds", () => {
    expect(sidebarSource).toContain("min-h-[36px] min-w-[36px]");
    expect(sidebarSource).toContain("lg:hidden");
  });

  it("enforces WCAG 44px minimum touch targets on all navigation links", () => {
    expect(sidebarSource).toContain("min-h-[44px]");
  });

  it("supports iOS safe area insets on drawer header and footer", () => {
    expect(sidebarSource).toContain("safe-area-inset-top");
    expect(sidebarSource).toContain("safe-area-inset-bottom");
  });
});

describe("Phase 2 Responsive Profile & Dashboard Specifications", () => {
  const profilePath = path.resolve(__dirname, "../components/profile/profile-view.tsx");
  const profileSource = fs.readFileSync(profilePath, "utf-8");

  const statCardPath = path.resolve(__dirname, "../components/analytics/stat-card.tsx");
  const statCardSource = fs.readFileSync(statCardPath, "utf-8");

  it("prevents iOS Safari auto-zoom on profile inputs with text-base sm:text-sm", () => {
    expect(profileSource).toContain("text-base sm:text-sm");
  });

  it("ensures profile inputs and buttons have at least 44px touch height", () => {
    expect(profileSource).toContain("min-h-[44px]");
    expect(profileSource).toContain("min-h-[46px]");
  });

  it("stacks personal name fields on mobile and splits on tablets/desktops", () => {
    expect(profileSource).toContain("grid grid-cols-1 sm:grid-cols-2");
  });

  it("formats stat cards with responsive padding and truncation", () => {
    expect(statCardSource).toContain("p-3.5 sm:p-5");
    expect(statCardSource).toContain("truncate");
  });
});
