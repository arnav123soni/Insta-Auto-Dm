import { describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { auth } from "../lib/auth";
import { redirect } from "next/navigation";
import LoginPage from "../app/login/page";

describe("Login Page Server Component (app/login/page.tsx)", () => {
  it("redirects authenticated users to /dashboard", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "logged_in_user_id" },
      expires: new Date().toISOString(),
    } as any);

    await LoginPage();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("renders login view for unauthenticated users", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const jsx = await LoginPage();
    expect(jsx).toBeDefined();
    expect(jsx.type).toBeDefined();
  });
});

describe("Brand Visual Assets", () => {
  const brandDir = path.resolve(__dirname, "../public/brand");

  it("has logo.jpg in public/brand", () => {
    expect(fs.existsSync(path.join(brandDir, "logo.jpg"))).toBe(true);
  });

  it("has icon-mark.png in public/brand", () => {
    expect(fs.existsSync(path.join(brandDir, "icon-mark.png"))).toBe(true);
  });

  it("has pedestal.png in public/brand", () => {
    expect(fs.existsSync(path.join(brandDir, "pedestal.png"))).toBe(true);
  });
});

describe("Responsive UI Specifications in AuthView", () => {
  const authViewPath = path.resolve(__dirname, "../components/auth/auth-view.tsx");
  const authViewSource = fs.readFileSync(authViewPath, "utf-8");

  it("uses dynamic viewport height (min-h-dvh) to avoid mobile address bar jumps", () => {
    expect(authViewSource).toContain("min-h-dvh");
  });

  it("includes iOS safe area padding insets", () => {
    expect(authViewSource).toContain("safe-area-inset-top");
    expect(authViewSource).toContain("safe-area-inset-bottom");
  });

  it("prevents iOS Safari auto-zoom on input focus with text-base sm:text-sm", () => {
    expect(authViewSource).toContain("text-base sm:text-sm");
  });

  it("enforces minimum touch targets of at least 44px for accessibility", () => {
    expect(authViewSource).toContain("min-h-[44px]");
    expect(authViewSource).toContain("min-h-[48px]");
  });

  it("clamps 3D pedestal badges on mobile to prevent horizontal viewport overflow", () => {
    expect(authViewSource).toContain("left-0 sm:-left-2");
    expect(authViewSource).toContain("right-0 sm:-right-2");
  });

  it("orders auth card above showcase on mobile and side-by-side on desktop", () => {
    expect(authViewSource).toContain("order-1 lg:order-2");
    expect(authViewSource).toContain("order-2 lg:order-1");
  });
});
