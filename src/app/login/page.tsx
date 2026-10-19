import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { getCurrentUser, googleAuthConfigured } from "@/lib/auth";
import { isDatabaseUnavailable } from "@/lib/db";
import { demoAccount } from "@/lib/demo-account";
import { safeNext } from "@/lib/return-path";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  google: "Google sign-in failed. Try again.",
  unverified: "The Google account email is not verified",
  denied: "Google sign-in was cancelled",
  linked: "This email is already linked to another Google account",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  let databaseError = "";
  try {
    const current = await getCurrentUser();
    if (current) redirect(safeNext(params.next));
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    databaseError = "Could not connect to the database. Check that MySQL on localhost port 3307 is running.";
  }

  const next = safeNext(params.next);
  const secretReady = (process.env.AUTH_SECRET?.length ?? 0) >= 32;
  const initialError =
    databaseError ||
    (!secretReady ? "AUTH_SECRET is not set in .env" : undefined) ||
    (params.error ? errors[params.error] : undefined);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)]">
      <header className="h-16 border-b border-[var(--hairline)] bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center px-6">
          <Link href="/login" className="flex items-center gap-3 text-[var(--ink)]">
            <span className="grid h-8 w-8 place-items-center bg-[var(--primary)] text-sm font-bold text-white">DX</span>
            <span className="text-base font-bold tracking-[0.3px]">DEXON Technology</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-md flex-1 content-start gap-8 px-6 py-16">
        <div>
          <p className="text-[13px] font-bold tracking-[1.5px] text-[var(--muted)] uppercase">Account</p>
          <h1 className="mt-3 text-[32px] leading-none font-bold text-[var(--ink)]">Sign in</h1>
          <p className="mt-3 font-light text-[var(--body)]">Use a database account, or a registered Google account</p>
        </div>
        <LoginForm next={next} googleEnabled={googleAuthConfigured()} initialError={initialError} />
        <div className="border border-[var(--hairline)] bg-[var(--surface-card)] p-4 text-sm font-light">
          <p className="font-bold text-[var(--ink)]">Demo account</p>
          <p className="mt-2">Email {demoAccount.email}</p>
          <p>Password {demoAccount.password}</p>
        </div>
      </main>
    </div>
  );
}
