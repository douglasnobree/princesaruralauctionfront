"use server";

import { destroySession } from "@/lib/auth/server/session";

export async function logoutAuctionAction() {
  await destroySession();
  return { success: true } as const;
}
