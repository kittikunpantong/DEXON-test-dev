import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { googleAuthConfigured, openSession, requestOrigin, upsertGoogleUser } from "@/lib/auth";
import { safeNext } from "@/lib/return-path";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session-token";

const STATE_COOKIE = "oauth_state";
const VERIFIER_COOKIE = "oauth_verifier";
const NEXT_COOKIE = "oauth_next";

const tokenSchema = z.object({ access_token: z.string().min(1) });
const profileSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.union([z.boolean(), z.string()]).optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

function oauthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
}

function redirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

function loginError(request: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(VERIFIER_COOKIE);
  response.cookies.delete(NEXT_COOKIE);
  return response;
}

function sameValue(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function httpsPicture(value: string | undefined): string | null {
  if (!value || !value.startsWith("https://")) return null;
  return value;
}

export function startGoogleLogin(request: NextRequest) {
  if (!googleAuthConfigured()) return loginError(request, "google");

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const origin = requestOrigin(request);
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url);
  const options = oauthCookieOptions();
  response.cookies.set(STATE_COOKIE, state, options);
  response.cookies.set(VERIFIER_COOKIE, verifier, options);
  response.cookies.set(NEXT_COOKIE, next, options);
  return response;
}

export async function finishGoogleLogin(request: NextRequest) {
  if (!googleAuthConfigured()) return loginError(request, "google");

  const url = request.nextUrl;
  if (url.searchParams.get("error")) return loginError(request, "denied");

  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const expectedState = request.cookies.get(STATE_COOKIE)?.value ?? "";
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value ?? "";
  const next = safeNext(request.cookies.get(NEXT_COOKIE)?.value);
  if (!code || !verifier || !state || !expectedState || !sameValue(state, expectedState)) {
    return loginError(request, "google");
  }

  const origin = requestOrigin(request);
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri(origin),
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) return loginError(request, "google");
    const token = tokenSchema.parse(await tokenResponse.json());

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!profileResponse.ok) return loginError(request, "google");
    const profile = profileSchema.parse(await profileResponse.json());
    const verified = profile.email_verified === true || profile.email_verified === "true";
    if (!verified) return loginError(request, "unverified");

    const user = await upsertGoogleUser({
      sub: profile.sub,
      email: profile.email,
      name: profile.name?.trim() || profile.email,
      imageUrl: httpsPicture(profile.picture),
    });
    const session = await openSession(user.id);
    const response = NextResponse.redirect(new URL(next, request.url));
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(VERIFIER_COOKIE);
    response.cookies.delete(NEXT_COOKIE);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("already linked to another Google account")) return loginError(request, "linked");
    return loginError(request, "google");
  }
}
