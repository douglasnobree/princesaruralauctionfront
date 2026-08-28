"use client";

import { Clock3, Eye, RefreshCw, UserCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  listAuctionRegistrationsAction,
  listManagerPendingEligibilityBidsAction,
  setAuctionRegistrationEnabledAction,
} from "@/hooks/actions/auctionEngineActions";
import type { EngineAuctionRegistration, EnginePendingEligibilityBid } from "@/lib/auctions/engine-types";
import { formatEngineBrlCents, formatEngineBrtInstant } from "@/lib/auctions/engine-formatters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const registrationStatusLabels: Record<EngineAuctionRegistration["status"], string> = {
  PENDING: "Aguardando análise",
  APPROVED: "Habilitado",
  SUSPENDED: "Suspenso",
  REVOKED: "Revogado",
};

function phaseLabel(phase: EnginePendingEligibilityBid["phase"]) {
  return phase === "LIVE_BID" ? "Lance ao vivo" : "Pré-lance";
}

export function AuctionPendingEligibilityBids({
  auctionId,
  lotId,
  lotNumber,
  lotTitle,
  currency = "BRL",
  canManageParticipants,
}: {
  auctionId: string;
  lotId: string;
  lotNumber?: number;
  lotTitle?: string;
  currency?: string;
  canManageParticipants: boolean;
}) {
  const [items, setItems] = useState<EnginePendingEligibilityBid[]>([]);
  const [registrations, setRegistrations] = useState<EngineAuctionRegistration[]>([]);
  const [selected, setSelected] = useState<EnginePendingEligibilityBid | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    if (!canManageParticipants) {
      setLoading(false);
      return;
    }

    setError(null);
    const [pendingResult, registrationResult] = await Promise.all([
      listManagerPendingEligibilityBidsAction(auctionId, { lotId, limit: "100" }),
      listAuctionRegistrationsAction(auctionId, { limit: "100" }),
    ]);

    if (pendingResult.success) setItems(pendingResult.data?.items ?? []);
    else setError(pendingResult.error || "Não foi possível carregar os lances aguardando análise.");

    if (registrationResult.success) setRegistrations(registrationResult.data?.items ?? []);
    else if (!pendingResult.success) setError(registrationResult.error || "Não foi possível carregar os dados dos participantes.");

    setLoading(false);
  }, [auctionId, canManageParticipants, lotId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const refresh = window.setInterval(() => void load(), 5000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refresh);
    };
  }, [load]);

  const registrationsByUserId = useMemo(
    () => new Map(registrations.map((registration) => [registration.userId, registration])),
    [registrations],
  );

  function enableParticipant(item: EnginePendingEligibilityBid) {
    if (!canManageParticipants) return;

    const registration = registrationsByUserId.get(item.participantId);
    if (!registration || registration.enabled === true) return;

    startTransition(async () => {
      const result = await setAuctionRegistrationEnabledAction(auctionId, registration.registrationId, true);
      if (!result.success) {
        setNotice(result.error || "Não foi possível habilitar este participante.");
        return;
      }

      setNotice("Participante habilitado. Os lances elegíveis serão liberados pelo motor.");
      await load();
    });
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5" aria-labelledby={`pending-eligibility-${lotId}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-800">
            <Clock3 className="size-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">{lotNumber ? `Lote ${String(lotNumber).padStart(2, "0")}` : "Lote"}</p>
          </div>
          <h3 id={`pending-eligibility-${lotId}`} className="mt-1 text-base font-bold text-amber-950">{lotTitle || "Lances aguardando análise"}</h3>
          <p className="mt-1 text-xs leading-5 text-amber-950/70">Lances e pré-lances recebidos enquanto o participante ainda não estava habilitado.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={!canManageParticipants || loading || isPending} className="border-amber-200 bg-white text-amber-900 hover:bg-amber-100">
          <RefreshCw className="size-3.5" aria-hidden="true" />Atualizar
        </Button>
      </div>

      {notice ? <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{notice}</p> : null}
      {!canManageParticipants ? <p className="mt-3 text-xs text-slate-600">Seu perfil não possui permissão para consultar ou administrar a fila de habilitação.</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p> : null}
      {canManageParticipants && loading ? <p className="mt-4 text-xs text-slate-600">Carregando lances aguardando análise…</p> : null}
      {canManageParticipants && !loading && !error && items.length === 0 ? <p className="mt-4 text-xs text-slate-600">Nenhum lance aguardando habilitação neste lote.</p> : null}

      {items.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-amber-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_9rem_minmax(0,auto)] gap-3 bg-amber-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-amber-900/70 sm:grid">
            <span>Participante</span><span>Fase</span><span>Recebido em</span><span>Ações</span>
          </div>
          <div className="divide-y divide-amber-100">
            {items.map((item) => {
              const registration = registrationsByUserId.get(item.participantId);
              const canEnable = Boolean(registration && registration.enabled !== true);
              const participantName = item.displayName || registration?.displayName || registration?.email || item.participantId;

              return (
                <div key={item.bidRequestId} className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_9rem_minmax(0,auto)] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{participantName}</p>
                      <span aria-label="Status: Aguardando análise" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
                        <Clock3 className="size-3" aria-hidden="true" />Aguardando análise
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{formatEngineBrlCents(item.amountCents, currency)} · {item.participantId}</p>
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 sm:hidden">{phaseLabel(item.phase)}</span>
                  </div>
                  <span className="hidden text-xs font-medium text-slate-600 sm:inline">{phaseLabel(item.phase)}</span>
                  <span className="text-xs text-slate-500">{formatEngineBrtInstant(item.receivedAt)}</span>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelected(item)} className="border-slate-200 text-slate-700">
                      <Eye className="size-3.5" aria-hidden="true" />Ver dados
                    </Button>
                    <Button type="button" size="sm" onClick={() => enableParticipant(item)} disabled={!canEnable || isPending} className="bg-[#0d3427] text-white hover:bg-[#075b3e]">
                      <UserCheck className="size-3.5" aria-hidden="true" />{canEnable ? "Habilitar usuário" : "Já habilitado"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dados do usuário</DialogTitle>
            <DialogDescription>Informações associadas ao lance que aguarda habilitação.</DialogDescription>
          </DialogHeader>
          {selected ? (() => {
            const registration = registrationsByUserId.get(selected.participantId);
            return (
              <dl className="grid gap-3 text-sm">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</dt><dd className="mt-1 font-medium">{selected.displayName || registration?.displayName || "Não informado"}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</dt><dd className="mt-1">{registration?.email || "Não informado"}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">ID do usuário</dt><dd className="mt-1 break-all font-mono text-xs">{selected.participantId}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status da inscrição</dt><dd className="mt-1">{registration ? registrationStatusLabels[registration.status] : "Inscrição não localizada"}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lance recebido</dt><dd className="mt-1 font-semibold">{formatEngineBrlCents(selected.amountCents, currency)} · {phaseLabel(selected.phase)}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data</dt><dd className="mt-1">{formatEngineBrtInstant(selected.receivedAt)}</dd></div>
              </dl>
            );
          })() : null}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Fechar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
