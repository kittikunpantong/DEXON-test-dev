"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "@/app/login/actions";
import { buttonPrimary, buttonSecondary, Field, FormError, inputClass } from "@/components/ui";

export function LoginForm({
  next,
  googleEnabled,
  initialError,
}: {
  next: string;
  googleEnabled: boolean;
  initialError?: string;
}) {
  const [state, action, pending] = useActionState(loginAction, null as LoginState);
  const message = state?.error ?? initialError;

  return (
    <div className="grid gap-5">
      <form action={action} className="grid gap-5">
        <input type="hidden" name="next" value={next} />
        <FormError message={message} />
        <Field label="Email">
          <input className={inputClass} name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label="Password">
          <input className={inputClass} name="password" type="password" autoComplete="current-password" required />
        </Field>
        <button className={`${buttonPrimary} w-full`} type="submit" disabled={pending}>
          {pending ? "Signing in" : "Sign in"}
        </button>
      </form>
      {googleEnabled ? (
        <a className={`${buttonSecondary} w-full gap-3`} href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
          <GoogleMark />
          Sign in with Google
        </a>
      ) : (
        <p className="text-[12px] font-normal tracking-[0.3px] text-[var(--muted)]">
          The Google button appears after GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in .env, and the redirect URI is registered as the site URL followed by /api/auth/google/callback
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
