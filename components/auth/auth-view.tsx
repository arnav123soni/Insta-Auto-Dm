"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Zap,
  Layers,
  BarChart3,
  Send,
  MessageCircle,
  Check,
  Loader2,
} from "lucide-react";

export function AuthView() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!firstName.trim()) {
          setError("First name is required.");
          setLoading(false);
          return;
        }
        if (!email.trim() || !email.includes("@")) {
          setError("Please enter a valid email address.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Failed to create account. Please try again.");
          setLoading(false);
          return;
        }

        // Auto sign-in immediately after successful registration
        const loginRes = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (loginRes?.error) {
          setSuccess("Account created! Please log in.");
          setMode("login");
          setLoading(false);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        // Login mode
        if (!email.trim() || !password) {
          setError("Please enter both email and password.");
          setLoading(false);
          return;
        }

        const res = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (res?.error) {
          setError("Invalid email or password. Please try again.");
          setLoading(false);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen w-full bg-[#08060f] text-foreground flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-x-hidden font-sans select-none">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-purple-700/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[500px] w-[500px] rounded-full bg-pink-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-[400px] w-[400px] rounded-full bg-orange-600/10 blur-[120px]" />

      {/* Main Container: 2-Column Split Screen */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT COLUMN: Feature Showcase & 3D Pedestal */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-8 pr-0 lg:pr-6">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-purple-950/60 ring-1 ring-white/20 bg-black/40">
              <Image
                src="/brand/icon-mark.png"
                alt="InstaReply Logo"
                fill
                sizes="48px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                Insta<span className="text-[#bc1888]">Reply</span>
              </div>
              <div className="text-[10px] tracking-[0.25em] text-zinc-400 font-semibold uppercase -mt-0.5">
                SYSTEM
              </div>
            </div>
          </div>

          {/* Headline & Subtitle */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Automate Your <br />
              <span className="bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] bg-clip-text text-transparent">
                Instagram Replies
              </span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
              AI-powered auto-reply system for your Instagram DMs &amp; comments. Never miss a lead again.
            </p>
          </div>

          {/* Grid Layout: Left Feature Pills + Right 3D Pedestal */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* 3 Feature Pills */}
            <div className="sm:col-span-5 flex flex-col space-y-3.5">
              {/* Feature 1 */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm transition-all hover:bg-white/[0.05]">
                <div className="p-2.5 rounded-xl bg-purple-900/40 text-purple-400 border border-purple-500/30 shrink-0">
                  <Zap className="w-4 h-4 fill-purple-400/20" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Auto Reply</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Instant responses to DMs &amp; comments</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm transition-all hover:bg-white/[0.05]">
                <div className="p-2.5 rounded-xl bg-pink-900/40 text-pink-400 border border-pink-500/30 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Smart Rules</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Keyword &amp; intent based automation</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm transition-all hover:bg-white/[0.05]">
                <div className="p-2.5 rounded-xl bg-orange-900/40 text-orange-400 border border-orange-500/30 shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Track Performance</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Analytics, leads &amp; engagement insights</p>
                </div>
              </div>
            </div>

            {/* 3D Pedestal Graphic & Floating Badges */}
            <div className="sm:col-span-7 relative flex items-center justify-center min-h-[280px]">
              {/* Pedestal Image */}
              <div className="relative w-full max-w-[340px] aspect-square">
                <Image
                  src="/brand/pedestal.png"
                  alt="3D Instagram Automation Pedestal"
                  fill
                  sizes="340px"
                  className="object-contain drop-shadow-[0_20px_50px_rgba(220,39,67,0.3)]"
                  priority
                />

                {/* Floating Notification Pill: Top-Left New DM */}
                <div className="absolute top-2 -left-2 sm:left-2 flex items-center gap-2 bg-[#161226]/90 border border-purple-500/40 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg shadow-purple-950/80 animate-bounce duration-1000">
                  <Send className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-semibold text-white">New DM</span>
                  <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    3
                  </span>
                </div>

                {/* Floating Notification Pill: Top-Right New Comment */}
                <div className="absolute top-12 -right-2 sm:right-2 flex items-center gap-2 bg-[#161226]/90 border border-pink-500/40 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg shadow-pink-950/80">
                  <MessageCircle className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-xs font-semibold text-white">New Comment</span>
                  <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    7
                  </span>
                </div>

                {/* Floating Notification Pill: Bottom Auto Reply Sent */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#161226]/95 border border-purple-500/50 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-xl shadow-purple-950/90 whitespace-nowrap">
                  <span className="text-xs font-semibold text-white">Auto Reply Sent</span>
                  <Check className="w-3.5 h-3.5 text-purple-300 stroke-[3]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Glassmorphism Auth Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-[#0f0c1b]/85 border border-white/10 p-7 sm:p-9 backdrop-blur-2xl shadow-2xl shadow-purple-950/60 ring-1 ring-white/5">
            {/* Card Brand Header */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-pink-950/60 ring-1 ring-white/20 bg-black/40 mb-3">
                <Image
                  src="/brand/icon-mark.png"
                  alt="InstaReply"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="text-sm font-black tracking-tight text-white flex items-center gap-1">
                Insta<span className="text-[#bc1888]">Reply</span>
                <span className="text-[9px] uppercase tracking-widest text-zinc-400 ml-1">SYSTEM</span>
              </div>

              <h2 className="text-2xl font-black text-white mt-4 tracking-tight">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {mode === "login"
                  ? "Login to your InstaReply account"
                  : "Start automating your Instagram replies"}
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs text-center font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Sign Up Mode: Name Fields */}
              {mode === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-[#181329] border border-[#2e264a] rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Last name (opt)"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-[#181329] border border-[#2e264a] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#181329] border border-[#2e264a] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#181329] border border-[#2e264a] rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Login Mode Extras: Remember Me & Forgot Password */}
              {mode === "login" && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#2e264a] bg-[#181329] text-pink-500 focus:ring-purple-500/30"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setError("Password reset link will be sent to your email.")}
                    className="text-purple-400 hover:text-purple-300 transition font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-95 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-pink-950/50 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <span>{mode === "login" ? "Login →" : "Create Account →"}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-[#0f0c1b] px-3 text-zinc-500">or</span>
              </div>
            </div>

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-[#181329] hover:bg-[#201a37] border border-[#2e264a] text-zinc-300 text-xs sm:text-sm font-medium py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2.5 active:scale-[0.99]"
            >
              {/* Official Google G SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Toggle Footer */}
            <div className="mt-6 text-center text-xs text-zinc-400">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-[#bc1888] font-bold hover:text-pink-400 transition ml-1"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-[#bc1888] font-bold hover:text-pink-400 transition ml-1"
                  >
                    Log In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
