import { NextRequest, NextResponse } from "next/server";
import { startGoogleLogin } from "@/lib/auth/server/google-start";
import { safeGoogleReturnTo, validGoogleCsrf } from "@/lib/auth/google-callback";

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try { form = await request.formData(); }
  catch { return redirectTo(request, "/login?googleError=failed"); }

  if (!validGoogleCsrf(request.cookies.get("g_csrf_token")?.value, form.get("g_csrf_token"))) {
    return redirectTo(request, "/login?googleError=failed");
  }
  const credential = form.get("credential");
  if (typeof credential !== "string" || credential.length < 20 || credential.length > 8192) {
    return redirectTo(request, "/login?googleError=failed");
  }
  const result = await startGoogleLogin(credential);
  const returnTo = safeGoogleReturnTo(form.get("state"), "/leiloes");
  if (!result.success) return redirectTo(request, `/login?googleError=failed&returnTo=${encodeURIComponent(returnTo)}`);
  return redirectTo(request, result.pending ? `/login/google?returnTo=${encodeURIComponent(returnTo)}` : returnTo);
}
