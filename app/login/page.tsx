import { auth, signIn, EMAIL_PROVIDER_ID, isGoogleAuthEnabled } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id || process.env.LOCAL_OWNER_ID) {
    redirect("/dashboard");
  }
  const { t } = await getI18n();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background text-foreground">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">OpenReply</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {t("Sign in by email, then connect your Instagram professional account.")}
          </p>
        </div>
        <div className="border border-white/10 bg-white/[0.035] rounded-xl p-8 space-y-6">
          <form
            action={async (formData) => {
              "use server";
              await signIn(EMAIL_PROVIDER_ID, formData);
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 mb-2">
                {t("Work email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              {t("Email me a magic link")}
            </button>
          </form>
          {isGoogleAuthEnabled && (
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <button
                type="submit"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Continue with Google
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
