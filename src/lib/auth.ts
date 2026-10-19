import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isDatabaseUnavailable, prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, decryptSession, encryptSession, sessionCookieOptions } from "@/lib/session-token";

const SESSION_DAYS = 7;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export function googleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function requestOrigin(request: Request): string {
  const configured = process.env.AUTH_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export async function openSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  const token = await encryptSession({
    sessionId: session.id,
    userId,
    expiresAt: expiresAt.toISOString(),
  });
  return { token, expiresAt };
}

export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await openSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const payload = await decryptSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (payload) {
    await prisma.session.deleteMany({ where: { id: payload.sessionId } });
  }
  await clearSessionCookie();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const payload = await decryptSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });
  const expired = !session || session.expiresAt.getTime() <= Date.now();
  const mismatch = session != null && session.userId !== payload.userId;
  if (!session || expired || mismatch) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    await clearSessionCookie();
    return null;
  }

  return { id: session.user.id, email: session.user.email, name: session.user.name };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function authenticatePassword(email: string, password: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    await verifyPassword(password, "scrypt$00000000000000000000000000000000$" + "00".repeat(64)).catch(() => false);
    return null;
  }
  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function upsertGoogleUser(profile: {
  sub: string;
  email: string;
  name: string;
  imageUrl: string | null;
}): Promise<AuthUser> {
  const email = profile.email.toLowerCase();
  const user = await prisma.$transaction(async (tx) => {
    const bySub = await tx.user.findUnique({ where: { googleSub: profile.sub } });
    if (bySub) {
      return tx.user.update({
        where: { id: bySub.id },
        data: {
          name: profile.name || bySub.name,
          imageUrl: profile.imageUrl,
        },
      });
    }

    const byEmail = await tx.user.findUnique({ where: { email } });
    if (byEmail) {
      if (byEmail.googleSub && byEmail.googleSub !== profile.sub) {
        throw new Error("This email is already linked to another Google account");
      }
      return tx.user.update({
        where: { id: byEmail.id },
        data: {
          googleSub: profile.sub,
          name: byEmail.name || profile.name,
          imageUrl: profile.imageUrl ?? byEmail.imageUrl,
        },
      });
    }

    return tx.user.create({
      data: {
        email,
        name: profile.name || email,
        googleSub: profile.sub,
        imageUrl: profile.imageUrl,
      },
    });
  });

  return { id: user.id, email: user.email, name: user.name };
}

export function authDatabaseMessage(error: unknown): string | null {
  if (!isDatabaseUnavailable(error)) return null;
  return "Could not connect to the database. Check that MySQL on localhost port 3307 is running.";
}
