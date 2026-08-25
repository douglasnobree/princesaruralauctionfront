"use client";

import {
  CalendarRange,
  Gavel,
  Home,
  LogOut,
  Menu,
  MonitorPlay,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PrincesaLogoIcon } from "@/components/AuctionHeader/PrincesaRuralIcon";
import { logoutAuctionAction } from "@/hooks/actions/auctionAuthActions";
import type { RolePermission } from "@/types/role-permissions";
import type { User } from "@/types/auth/user";

const navItems = [
  { href: "/admin/leiloes", label: "Catálogo de leilões", icon: Gavel },
  {
    href: "/admin/leiloes/sandbox",
    label: "Ambiente de teste",
    icon: MonitorPlay,
  },
] as const;

function accountLabel(accountType: string) {
  return (
    {
      ADMIN: "Administrador",
      MODERATOR: "Moderador",
      TIN1: "TI N1",
      TIN2: "TI N2",
    } as Record<string, string>
  )[accountType] ?? accountType;
}

function Navigation({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="flex-1 overflow-y-auto px-3 py-4"
      aria-label="Navegação de gestão"
    >
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Gestão de leilões
      </p>
      <div className="space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={compact ? label : undefined}
              className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "bg-primary/10 text-primary shadow-[inset_3px_0_0_var(--primary)]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              } ${compact ? "justify-center px-2" : ""}`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {!compact ? (
                <span>{label}</span>
              ) : (
                <span className="sr-only">{label}</span>
              )}
            </Link>
          );
        })}
      </div>
      {!compact ? (
        <div className="mt-6 border-t pt-4">
          <Link
            href="/leiloes"
            onClick={onNavigate}
            className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none transition-[background-color,color] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Home className="size-4 shrink-0" aria-hidden="true" />
            <span>Visão pública</span>
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

function UserSummary({
  user,
  onLogout,
  isPending,
  compact = false,
}: {
  user: User;
  onLogout: () => void;
  isPending: boolean;
  compact?: boolean;
}) {
  const initials = user.email.slice(0, 1).toUpperCase();
  return (
    <div className={`border-t p-3 ${compact ? "px-2" : ""}`}>
      <div
        className={`flex items-center gap-3 rounded-lg bg-muted/60 p-2.5 ${compact ? "justify-center" : ""}`}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
          {initials}
        </span>
        {!compact ? (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{user.email}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {accountLabel(user.accountType)}
            </p>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onLogout}
        disabled={isPending}
        title={compact ? "Sair" : undefined}
        className={`mt-2 flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-foreground outline-none transition-[background-color,color] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${compact ? "justify-center" : ""}`}
      >
        <LogOut className="size-3.5" aria-hidden="true" />
        {!compact ? (
          isPending ? "Saindo…" : "Sair"
        ) : (
          <span className="sr-only">{isPending ? "Saindo" : "Sair"}</span>
        )}
      </button>
    </div>
  );
}

export function AuctionManagementShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User;
  permissions?: RolePermission[] | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      await logoutAuctionAction();
      router.replace("/login");
      router.refresh();
    });
  }

  const currentLabel = pathname.includes("/sandbox")
    ? "Ambiente de teste"
    : pathname.includes("/broadcast")
      ? "Broadcast / OBS"
      : pathname.includes("/novo")
        ? "Novo leilão"
        : pathname === "/admin/leiloes"
          ? "Catálogo"
          : "Workspace";

  return (
    <div className="auction-management-shell flex min-h-screen bg-gray-50/50 text-foreground dark:bg-gray-950/50">
      <a
        href="#auction-management-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>

      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-background transition-[width] duration-200 lg:flex ${collapsed ? "w-[4.5rem]" : "w-64"}`}
        aria-label="Navegação de operação"
      >
        <Link
          href="/admin/leiloes"
          className={`block border-b px-4 py-6 outline-none transition-colors hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-ring ${collapsed ? "px-2" : ""}`}
        >
          <div
            className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
          >
            <PrincesaLogoIcon
              size={collapsed ? 38 : 44}
              aria-hidden="true"
            />
            {!collapsed ? (
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-tight">
                  <span className="text-primary">Princesa</span>{" "}
                  <span className="text-secondary">Rural</span>
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Operação de leilões
                </p>
              </div>
            ) : null}
          </div>
        </Link>
        <Navigation compact={collapsed} />
        <UserSummary
          user={user}
          onLogout={logout}
          isPending={isPending}
          compact={collapsed}
        />
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="m-3 hidden min-h-9 items-center justify-center rounded-lg border text-xs font-semibold text-muted-foreground outline-none transition-[background-color,color] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring xl:flex"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? "→" : "← Recolher"}
        </button>
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-[70] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de gestão"
        >
          <button
            type="button"
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-5">
              <Link
                href="/admin/leiloes"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3"
              >
                <PrincesaLogoIcon size={40} aria-hidden="true" />
                <span className="text-lg font-bold">
                  <span className="text-primary">Princesa</span>{" "}
                  <span className="text-secondary">Rural</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid size-9 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <Navigation onNavigate={() => setMobileOpen(false)} />
            <UserSummary user={user} onLogout={logout} isPending={isPending} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-50 flex min-h-14 items-center justify-between gap-3 border-b bg-background/95 px-3 backdrop-blur sm:min-h-16 sm:px-4 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
              <Link
                href="/admin/leiloes"
                className="text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Leilões
              </Link>
              <span className="text-muted-foreground/50" aria-hidden="true">
                /
              </span>
              <span className="truncate font-medium">{currentLabel}</span>
            </div>
            <div className="min-w-0 sm:hidden">
              <p className="truncate text-sm font-semibold">{currentLabel}</p>
              <p className="text-[11px] text-muted-foreground">
                Central de leilões
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground md:inline-flex">
              <CalendarRange className="size-3.5 text-secondary" aria-hidden="true" />
              Operação protegida
            </span>
            <Link
              href="/leiloes"
              className="hidden min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold outline-none transition-[background-color,color] duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
            >
              <Home className="size-3.5" aria-hidden="true" />
              Visão pública
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={isPending}
              className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold text-muted-foreground outline-none transition-[background-color,color] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:hidden"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sair
            </button>
          </div>
        </header>
        <main
          id="auction-management-main"
          className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8"
        >
          <div className="mx-auto w-full max-w-none space-y-5 sm:space-y-6 lg:space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
