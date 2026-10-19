import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";

export type SessionPayload = {
  sessionId: string;
  userId: string;
  expiresAt: string;
};

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    expires: expiresAt,
    path: "/",
  };
}

function secretKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("Set AUTH_SECRET in .env to at least 32 characters");
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(key);
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  const key = secretKey();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.sessionId !== "string" || typeof payload.userId !== "string") return null;
    const expiresAt = typeof payload.expiresAt === "string" ? payload.expiresAt : "";
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) return null;
    return { sessionId: payload.sessionId, userId: payload.userId, expiresAt };
  } catch {
    return null;
  }
}
