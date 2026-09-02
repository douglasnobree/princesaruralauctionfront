import { NextResponse } from "next/server";
import { refreshSessionResult } from "@/lib/auth/server/session";

export async function POST() {
  const result = await refreshSessionResult();
  if (result.status !== "success") {
    if (result.status === "missing" || result.status === "invalid") {
      return NextResponse.json({ success: false, error: "Sessão expirada." }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Não foi possível renovar a sessão agora." },
      { status: 503 },
    );
  }
  return NextResponse.json({ success: true, expiresAt: result.session.expiresAt });
}
