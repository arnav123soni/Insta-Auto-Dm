import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/password";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { isEmailAllowedToSignIn } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password } = body ?? {};

    if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
      return NextResponse.json(
        { success: false, error: "First name is required" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isEmailAllowedToSignIn(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "This email address is not permitted to register" },
        { status: 403 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const fullName = [firstName.trim(), (lastName || "").trim()]
      .filter(Boolean)
      .join(" ");

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: normalizedEmail,
        passwordHash,
      },
    });

    // Auto-provision an isolated, private workspace for this user
    await ensureWorkspaceForUser(user.id, user.email);

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
