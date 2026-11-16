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
