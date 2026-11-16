"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
}

export function ProfileView() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Edit State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setProfile(data.user);
        const parts = (data.user.name || "").split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setSavingProfile(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileError(data.error || "Failed to update profile.");
      } else {
        setProfileSuccess("Profile details updated successfully!");
        setProfile(data.user);
      }
    } catch (err: any) {
      setProfileError(err?.message || "An unexpected error occurred.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordError(data.error || "Failed to update password.");
      } else {
        setPasswordSuccess("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPasswordError(err?.message || "An unexpected error occurred.");
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "IR";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight sm:text-3xl">
          Account Profile &amp; Security
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage your personal details, credentials, and active login session.
        </p>
      </div>

      {/* User Overview Banner */}
      <div className="p-6 rounded-2xl bg-surface/80 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white text-xl font-black shadow-lg shadow-pink-950/50 shrink-0">
          {initials}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-foreground">
            {profile?.name || "Account Owner"}
          </h2>
          <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              {profile?.email}
            </span>
            {profile?.createdAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" />
              Active Session
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: Personal Details */}
        <div className="p-6 sm:p-7 rounded-2xl bg-surface/80 border border-white/10 backdrop-blur-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
              <User className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-foreground">Personal Details</h2>
            </div>

            {profileError && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}
            {profileSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form id="profile-form" onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-background/80 border border-border rounded-xl px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-foreground placeholder-muted focus:outline-none focus:border-purple-500 transition min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-background/80 border border-border rounded-xl px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-foreground placeholder-muted focus:outline-none focus:border-purple-500 transition min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ""}
                    className="w-full bg-background/40 border border-border/50 rounded-xl pl-10 pr-4 py-3 sm:py-2.5 text-base sm:text-sm text-muted cursor-not-allowed select-none min-h-[44px]"
                  />
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Email is your unique login identifier.
                </p>
              </div>
            </form>
          </div>

          <div className="pt-6 border-t border-border/60 mt-6">
            <button
              type="submit"
              form="profile-form"
              disabled={savingProfile}
              className="w-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-95 text-white font-bold py-3 sm:py-2.5 px-4 rounded-xl shadow-md shadow-pink-950/40 transition flex items-center justify-center gap-2 text-sm sm:text-base min-h-[46px] disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Password & Security */}
        <div className="p-6 sm:p-7 rounded-2xl bg-surface/80 border border-white/10 backdrop-blur-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
              <Lock className="w-5 h-5 text-pink-400" />
              <h2 className="text-base font-bold text-foreground">Change Password</h2>
            </div>

            {passwordError && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form id="password-form" onSubmit={handleUpdatePassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-background/80 border border-border rounded-xl pl-3.5 pr-11 py-3 sm:py-2.5 text-base sm:text-sm text-foreground placeholder-muted focus:outline-none focus:border-purple-500 transition min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted hover:text-foreground transition"
                    tabIndex={-1}
                    aria-label={showCurrentPass ? "Hide current password" : "Show current password"}
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-background/80 border border-border rounded-xl pl-3.5 pr-11 py-3 sm:py-2.5 text-base sm:text-sm text-foreground placeholder-muted focus:outline-none focus:border-purple-500 transition min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted hover:text-foreground transition"
                    tabIndex={-1}
                    aria-label={showNewPass ? "Hide new password" : "Show new password"}
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-background/80 border border-border rounded-xl px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-foreground placeholder-muted focus:outline-none focus:border-purple-500 transition min-h-[44px]"
                />
              </div>
            </form>
          </div>

          <div className="pt-6 border-t border-border/60 mt-6">
            <button
              type="submit"
              form="password-form"
              disabled={savingPassword}
              className="w-full bg-surface-elevated hover:bg-surface-hover border border-white/10 text-foreground font-bold py-3 sm:py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm sm:text-base min-h-[46px] disabled:opacity-50"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-pink-400" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Card 3: Active Session & Danger Zone */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface/80 border border-red-500/20 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="text-center sm:text-left">
          <h2 className="text-base font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
            <LogOut className="w-4 h-4 text-red-400" />
            Sign Out of Account
          </h2>
          <p className="text-xs text-muted mt-1">
            End your 30-day login session on this device. You will need your email and password to log back in.
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 active:scale-[0.98] min-h-[44px]"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
