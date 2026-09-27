import { NextRequest, NextResponse } from "next/server";
import { startGoogleLogin } from "@/lib/auth/server/google-start";
import { safeGoogleReturnTo, validGoogleCsrf } from "@/lib/auth/google-callback";

function redirectTo(path: string) {
  const response = new NextResponse(null, { status: 303, headers: { Location: path } });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try { form = await request.formData(); }
  catch {
    console.warn("[auth/google] Callback com formulário inválido");
    return redirectTo("/login?googleError=failed");
  }

  if (!validGoogleCsrf(request.cookies.get("g_csrf_token")?.value, form.get("g_csrf_token"))) {
    console.warn("[auth/google] Callback com CSRF inválido", { cookiePresent: Boolean(request.cookies.get("g_csrf_token")) });
    return redirectTo("/login?googleError=failed");
  }
  const credential = form.get("credential");
  if (typeof credential !== "string" || credential.length < 20 || credential.length > 8192) {
    console.warn("[auth/google] Callback sem credencial válida");
    return redirectTo("/login?googleError=failed");
  }
  const result = await startGoogleLogin(credential);
  const returnTo = safeGoogleReturnTo(form.get("state"), "/leiloes");
  if (!result.success) return redirectTo(`/login?googleError=failed&returnTo=${encodeURIComponent(returnTo)}`);
  return redirectTo(result.pending ? `/login/google?returnTo=${encodeURIComponent(returnTo)}` : returnTo);
}
