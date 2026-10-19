"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { authDatabaseMessage, authenticatePassword, endSession, startSession } from "@/lib/auth";
import { safeNext } from "@/lib/return-path";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type LoginState = { error?: string } | null;

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password" };
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    return { error: "AUTH_SECRET is not set in .env" };
  }

  const next = safeNext(String(formData.get("next") ?? ""));
  try {
    const user = await authenticatePassword(parsed.data.email.toLowerCase(), parsed.data.password);
    if (!user) return { error: "Email or password is incorrect" };
    await startSession(user.id);
  } catch (error) {
    const databaseMessage = authDatabaseMessage(error);
    if (databaseMessage) return { error: databaseMessage };
    throw error;
  }
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
