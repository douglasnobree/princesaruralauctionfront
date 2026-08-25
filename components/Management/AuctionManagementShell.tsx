"use client";

import { ChevronLeft, ChevronRight, Gavel, LayoutDashboard, LogOut, MonitorPlay, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logoutAuctionAction } from "@/hooks/actions/auctionAuthActions";
import type { RolePermission } from "@/types/role-permissions";
import type { User } from "@/types/auth/user";

const navItems = [
  { href: "/admin/leiloes", label: "Leilões", icon: Gavel },
  { href: "/admin/leiloes/sandbox", label: "Ambiente de ensaio", icon: LayoutDashboard },
] as const;

export function AuctionManagementShell({ children, user }: { children: React.ReactNode; user: User; permissions?: RolePermission[] | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const label = user.accountType === "ADMIN" ? "Administrador" : user.accountType;
  function logout() { startTransition(async () => { await logoutAuctionAction(); router.replace("/login"); router.refresh(); }); }
  return <div className="auction-management-shell min-h-screen bg-[#f4f7f5] text-slate-950">
    <a href="#auction-management-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:shadow-lg">Pular para o conteúdo</a>
    <div className="flex min-h-screen">
      <aside className={`hidden border-r border-[#dfe8e2] bg-[#0d3427] text-white transition-[width] duration-200 lg:flex lg:flex-col ${collapsed ? "w-[76px]" : "w-[248px]"}`} aria-label="Navegação de operação">
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-4"><Link href="/admin/leiloes" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b64f]"> <span className="grid size-10 place-items-center rounded-xl bg-[#f4b64f] text-[#183329]"><Gavel className="size-5" aria-hidden="true" /></span>{!collapsed ? <span><strong className="block text-sm">Princesa Rural</strong><span className="text-xs text-white/60">Operação de leilões</span></span> : null}</Link><button type="button" onClick={() => setCollapsed((value) => !value)} className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b64f]" aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>{collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}</button></div>
        <nav className="flex-1 space-y-1 p-3">{navItems.map(({ href, label: itemLabel, icon: Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} aria-current={active ? "page" : undefined} title={collapsed ? itemLabel : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b64f] ${active ? "bg-white text-[#0d3427]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon className="size-4 shrink-0" aria-hidden="true" />{!collapsed ? itemLabel : null}</Link>; })}<div className="mt-5 border-t border-white/10 pt-4">{!collapsed ? <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">No leilão</p> : null}<Link href="/leiloes" title={collapsed ? "Visão pública" : undefined} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b64f]"><MonitorPlay className="size-4 shrink-0" aria-hidden="true" />{!collapsed ? "Visão pública" : null}</Link></div></nav>
        <div className="border-t border-white/10 p-3"><div className={`rounded-xl bg-white/8 p-3 ${collapsed ? "px-2" : ""}`}><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f4b64f] text-xs font-bold text-[#183329]">{user.email.slice(0,1).toUpperCase()}</span>{!collapsed ? <div className="min-w-0"><p className="truncate text-xs font-semibold">{user.email}</p><p className="mt-0.5 text-[11px] text-white/55">{label}</p></div> : null}</div>{!collapsed ? <button type="button" onClick={logout} disabled={isPending} className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b64f]"><LogOut className="size-4" aria-hidden="true" />{isPending ? "Saindo…" : "Sair"}</button> : null}</div></div>
      </aside>
      <div className="min-w-0 flex-1"><header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-[#dfe8e2] bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6 lg:px-8"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#08734e]">Central de leilões</p><p className="mt-0.5 text-sm font-semibold text-slate-700">Gestão e operação protegidas</p></div><div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-[#dfe8e2] px-3 py-2 text-xs font-semibold text-slate-600 sm:inline-flex"><ShieldCheck className="size-3.5 text-[#08734e]" aria-hidden="true" />Sessão segura</span><button type="button" onClick={logout} disabled={isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] lg:hidden"><LogOut className="size-4" aria-hidden="true" />Sair</button></div></header><main id="auction-management-main" className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main></div>
    </div>
  </div>;
}
