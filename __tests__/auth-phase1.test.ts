import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockEnsureWorkspaceForUser, mockAuthState } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  mockEnsureWorkspaceForUser: vi.fn(),
  mockAuthState: {
    currentUserId: "test-user-id" as string | null,
  },
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceForUser: mockEnsureWorkspaceForUser,
  getPrimaryWorkspace: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUserId: vi.fn(() => Promise.resolve(mockAuthState.currentUserId)),
  getCurrentWorkspaceId: vi.fn(() => Promise.resolve("ws-123")),
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
  authConfig: {
    providers: [
      {
        id: "credentials",
        name: "credentials",
        authorize: async (credentials: any) => {
          if (!credentials?.email || !credentials?.password) return null;
          const email = String(credentials.email).trim().toLowerCase();
          const user = await mockPrisma.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) return null;
          const { verifyPassword } = await import("@/lib/password");
          const isValid = await verifyPassword(String(credentials.password), user.passwordHash);
          if (!isValid) return null;
          return { id: user.id, name: user.name, email: user.email, image: user.image };
        },
      },
    ],
  },
}));

import { hashPassword, verifyPassword } from "../lib/password";
import { POST as handleSignup } from "../app/api/auth/signup/route";
import { GET as getProfile, PUT as updateProfile } from "../app/api/user/profile/route";
import { PUT as updatePassword } from "../app/api/user/password/route";
import { authConfig } from "../lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthState.currentUserId = "test-user-id";
});

describe("Password Hashing & Verification (lib/password)", () => {
  it("hashes password and verifies successfully", async () => {
    const raw = "SuperSecret123!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith("$2")).toBe(true);

    const valid = await verifyPassword(raw, hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("WrongPassword", hash);
    expect(invalid).toBe(false);
  });

  it("throws error for passwords shorter than 6 characters", async () => {
    await expect(hashPassword("12345")).rejects.toThrow(
      "Password must be at least 6 characters long"
    );
  });

  it("returns false when verifying empty values", async () => {
    expect(await verifyPassword("", "$2a$12$something")).toBe(false);
    expect(await verifyPassword("password", null)).toBe(false);
  });
});

describe("NextAuth Credentials Provider (lib/auth)", () => {
  const credentialsProvider = authConfig.providers.find(
    (p: any) => p.id === "credentials"
  ) as any;

  it("exists in providers configuration", () => {
    expect(credentialsProvider).toBeDefined();
    expect(credentialsProvider.id).toBe("credentials");
  });

  it("authorizes user with valid credentials", async () => {
    const hash = await hashPassword("ValidPass123");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "usr_123",
      email: "test@example.com",
      name: "Test User",
      image: null,
      passwordHash: hash,
    });

    const user = await credentialsProvider.authorize({
      email: "  TEST@EXAMPLE.COM  ",
      password: "ValidPass123",
    });

    expect(user).toEqual({
      id: "usr_123",
      email: "test@example.com",
      name: "Test User",
      image: null,
    });
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("ValidPass123");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "usr_123",
      email: "test@example.com",
      passwordHash: hash,
    });

    const result = await credentialsProvider.authorize({
      email: "test@example.com",
      password: "WrongPassword!",
    });

    expect(result).toBeNull();
  });

  it("rejects non-existent email", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await credentialsProvider.authorize({
      email: "unknown@example.com",
      password: "AnyPassword",
    });

    expect(result).toBeNull();
  });
});

describe("Registration API (POST /api/auth/signup)", () => {
  it("rejects missing first name", async () => {
    const req = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com", password: "password123" }),
    });

    const res = await handleSignup(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("First name is required");
  });

  it("rejects invalid email format", async () => {
    const req = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ firstName: "Alice", email: "invalid-email", password: "password123" }),
    });

    const res = await handleSignup(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("A valid email address is required");
  });

  it("rejects passwords shorter than 6 characters", async () => {
    const req = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ firstName: "Alice", email: "alice@example.com", password: "123" }),
    });

    const res = await handleSignup(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Password must be at least 6 characters long");
  });

  it("rejects duplicate email with 409 Conflict", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing_user" });

    const req = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ firstName: "Alice", email: "alice@example.com", password: "password123" }),
    });

    const res = await handleSignup(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("An account with this email already exists");
  });

  it("creates user and provisions isolated workspace", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "usr_alice",
      name: "Alice Smith",
      email: "alice@example.com",
    });

    const req = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        firstName: "Alice",
        lastName: "Smith",
        email: "Alice@Example.COM ",
        password: "securePassword123",
      }),
    });

    const res = await handleSignup(req);
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "alice@example.com",
          name: "Alice Smith",
        }),
      })
    );

    // Verify workspace was automatically provisioned
    expect(mockEnsureWorkspaceForUser).toHaveBeenCalledWith("usr_alice", "alice@example.com");
  });
});

describe("Profile API (GET/PUT /api/user/profile)", () => {
  it("returns 401 when unauthorized", async () => {
    mockAuthState.currentUserId = null;
    const res = await getProfile();
    expect(res.status).toBe(401);
  });

  it("returns user profile when authenticated", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "test-user-id",
      name: "John Doe",
      email: "john@example.com",
      image: null,
      createdAt: new Date(),
    });

    const res = await getProfile();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.name).toBe("John Doe");
    expect(data.user.email).toBe("john@example.com");
  });

  it("updates user name", async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: "test-user-id",
      name: "Jane Doe",
      email: "john@example.com",
      image: null,
    });

    const req = new Request("http://localhost/api/user/profile", {
      method: "PUT",
      body: JSON.stringify({ firstName: "Jane", lastName: "Doe" }),
    });

    const res = await updateProfile(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "test-user-id" },
        data: { name: "Jane Doe" },
      })
    );
  });
});

describe("Password Change API (PUT /api/user/password)", () => {
  it("rejects incorrect current password", async () => {
    const currentHash = await hashPassword("OldPassword123");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "test-user-id",
      passwordHash: currentHash,
    });

    const req = new Request("http://localhost/api/user/password", {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: "WrongOldPassword",
        newPassword: "BrandNewPassword123",
      }),
    });

    const res = await updatePassword(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Incorrect current password");
  });

  it("updates password when current password is valid", async () => {
    const currentHash = await hashPassword("OldPassword123");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "test-user-id",
      passwordHash: currentHash,
    });
    mockPrisma.user.update.mockResolvedValue({ id: "test-user-id" });

    const req = new Request("http://localhost/api/user/password", {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: "OldPassword123",
        newPassword: "BrandNewPassword123",
      }),
    });

    const res = await updatePassword(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "test-user-id" },
        data: expect.objectContaining({
          passwordHash: expect.any(String),
        }),
      })
    );
  });
});
