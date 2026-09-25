"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { logoutAuctionAction } from "@/hooks/actions/auctionAuthActions";

export function AuctionProfileMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function logout() {
    if (isPending) return;
    startTransition(async () => {
      await logoutAuctionAction();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative order-2 md:order-3">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="auction-profile-menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 max-w-[14rem] items-center gap-2 rounded-full border border-white/75 px-3 text-xs font-medium outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 md:min-h-8"
      >
        <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{email}</span>
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div
          id="auction-profile-menu"
          role="group"
          aria-label="Opções da conta"
          className="absolute right-0 top-full z-[60] mt-2 w-56 overflow-hidden rounded-xl border border-white/15 bg-[#062518] p-1.5 text-white shadow-xl"
        >
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#fbaa34]"
          >
            <UserRound className="size-4" aria-hidden="true" />
            Meu perfil
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={isPending}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#fbaa34] disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {isPending ? "Saindo…" : "Sair"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
