import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/auth/server/session";

export async function POST() {
  const session = await refreshSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Sessão expirada." }, { status: 401 });
  }
  return NextResponse.json({ success: true, expiresAt: session.expiresAt });
}
