"use server";

import { cookies } from "next/headers";
import type { SessionData } from "@/types/auth/sessionData";
import type { User } from "@/types/auth/user";

const SESSION_COOKIE_NAME = "session";

/**
 * Reads the session created by the main Princesa Rural frontend.
 * The auction app deliberately does not own login or account management.
 */
export async function getSession(): Promise<SessionData | null> {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!sessionCookie) return null;

  try {
    return JSON.parse(sessionCookie.value) as SessionData;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  return (await getSession())?.user ?? null;
}

