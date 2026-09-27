"use client";

import { useEffect, useRef, useState } from "react";

type GoogleIdentity = { accounts: { id: { initialize(options: { client_id: string; ux_mode: "redirect"; login_uri: string }): void; renderButton(element: HTMLElement, options: Record<string, string | number>): void } } };
declare global { interface Window { google?: GoogleIdentity } }

export function GoogleLoginButton({ returnTo = "/" }: { returnTo?: string }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    const render = () => {
      if (!active || !window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: "redirect",
        login_uri: `${window.location.origin}/api/auth/google/callback`,
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, { theme: "outline", size: "large", text: "continue_with", width: Math.min(buttonRef.current.clientWidth, 400), locale: "pt-BR", state: returnTo });
    };
    if (window.google) render();
    else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = render;
      script.onerror = () => setError("Não foi possível carregar o login do Google.");
      document.head.appendChild(script);
    }
    return () => { active = false; };
  }, [clientId, returnTo]);

  if (!clientId) return null;
  return <div className="mt-5 border-t border-gray-200 pt-5"><div ref={buttonRef} className="flex min-h-11 justify-center" aria-label="Entrar com Google" />{error && <p className="mt-2 text-center text-sm text-red-700" role="alert">{error}</p>}</div>;
}
