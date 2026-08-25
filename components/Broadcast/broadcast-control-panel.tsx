"use client";

import { useState, useTransition } from "react";
import { BroadcastOverlay } from "@/components/Broadcast/broadcast-overlay";
import {
  createBroadcastTokenAction,
  getBroadcastAdminStateAction,
  getBroadcastClientsAction,
  getBroadcastConfigAction,
  listBroadcastTokensAction,
  rebroadcastAuctionStateAction,
  revokeBroadcastTokenAction,
  updateBroadcastConfigAction,
  type BroadcastTokenSummary,
} from "@/hooks/actions/broadcastActions";
import type {
  BroadcastClientInfo,
  BroadcastConfig,
  BroadcastState,
} from "@/lib/broadcast/broadcast-types";

type BroadcastControlPanelProps = {
  auctionId: string;
  initialState: BroadcastState | null;
  initialConfig: BroadcastConfig;
  initialClients: BroadcastClientInfo[];
  initialTokens: BroadcastTokenSummary[];
  initialError?: string;
  canManageBroadcast?: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function stateLabel(state: BroadcastState | null) {
  if (!state) return "Sem snapshot";
  if (!state.currentLot) return "Sem lote atual";
  return `Lote ${String(state.currentLot.number).padStart(3, "0")} · ${state.currentLot.title}`;
}

export function BroadcastControlPanel({
  auctionId,
  initialState,
  initialConfig,
  initialClients,
  initialTokens,
  initialError,
  canManageBroadcast = true,
}: BroadcastControlPanelProps) {
  const [state, setState] = useState(initialState);
  const [config, setConfig] = useState(initialConfig);
  const [clients, setClients] = useState(initialClients);
  const [tokens, setTokens] = useState(initialTokens);
  const [delay, setDelay] = useState(String(initialConfig.overlayDelayMs));
  const [maxRecentBids, setMaxRecentBids] = useState(
    String(initialConfig.maxRecentBids),
  );
  const [label, setLabel] = useState("obs-main");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [notice, setNotice] = useState(initialError ?? "");
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const [stateResult, configResult, clientsResult, tokensResult] =
        await Promise.all([
          getBroadcastAdminStateAction(auctionId),
          getBroadcastConfigAction(auctionId),
          getBroadcastClientsAction(auctionId),
          listBroadcastTokensAction(auctionId),
        ]);
      if (stateResult.success && stateResult.data) setState(stateResult.data);
      if (configResult.success && configResult.data) {
        setConfig(configResult.data);
        setDelay(String(configResult.data.overlayDelayMs));
        setMaxRecentBids(String(configResult.data.maxRecentBids));
      }
      if (clientsResult.success && clientsResult.data) setClients(clientsResult.data);
      if (tokensResult.success && tokensResult.data) setTokens(tokensResult.data);
      const error = [stateResult, configResult, clientsResult, tokensResult].find(
        (result) => !result.success,
      )?.error;
      setNotice(error ?? "Estado atualizado.");
    });
  };

  const updateConfig = () => {
    if (!canManageBroadcast) return;
    startTransition(async () => {
      const result = await updateBroadcastConfigAction(auctionId, {
        overlayDelayMs: Number(delay),
        maxRecentBids: Number(maxRecentBids),
      });
      if (!result.success || !result.data) {
        setNotice(result.error ?? "Não foi possível atualizar a configuração.");
        return;
      }
      setConfig(result.data);
      setNotice("Configuração do overlay atualizada.");
    });
  };

  const rebroadcast = () => {
    if (!canManageBroadcast) return;
    startTransition(async () => {
      const result = await rebroadcastAuctionStateAction(auctionId);
      if (result.success && result.data) {
        setState(result.data);
        setNotice("Snapshot reenviado aos overlays conectados.");
      } else {
        setNotice(result.error ?? "Não foi possível reenviar o snapshot.");
      }
    });
  };

  const createToken = () => {
    if (!canManageBroadcast) return;
    startTransition(async () => {
      const result = await createBroadcastTokenAction(auctionId, {
        clientLabel: label,
        expiresInDays: Number(expiresInDays),
      });
      if (!result.success || !result.data) {
        setNotice(result.error ?? "Não foi possível criar o token.");
        return;
      }
      const tokenData = result.data;
      const url = new URL(
        `/broadcast/auction/${encodeURIComponent(auctionId)}`,
        window.location.origin,
      );
      url.searchParams.set("token", tokenData.token);
      url.searchParams.set("clientId", label || "obs-main");
      setOverlayUrl(url.toString());
      setPreviewToken(tokenData.token);
      setTokens((current) => [
        {
          id: tokenData.tokenId,
          clientLabel: tokenData.clientLabel,
          expiresAt: tokenData.expiresAt,
          revokedAt: null,
          lastUsedAt: null,
        },
        ...current,
      ]);
      setNotice("Token criado. Copie a URL para o Browser Source do OBS.");
    });
  };

  const revokeToken = (tokenId: string) => {
    if (!canManageBroadcast) return;
    startTransition(async () => {
      const result = await revokeBroadcastTokenAction(auctionId, tokenId);
      if (!result.success) {
        setNotice(result.error ?? "Não foi possível revogar o token.");
        return;
      }
      setTokens((current) =>
        current.map((token) =>
          token.id === tokenId
            ? { ...token, revokedAt: new Date().toISOString() }
            : token,
        ),
      );
      setNotice("Token revogado.");
    });
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
            Leilão · Transmissão
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Control room do overlay
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe o snapshot oficial e prepare o Browser Source do OBS.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={isPending}
            className="inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-semibold outline-none transition-[background-color,scale] duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-50"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={rebroadcast}
            disabled={isPending || !canManageBroadcast}
            className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition-[background-color,scale] duration-150 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-50"
          >
            Reenviar estado
          </button>
        </div>
      </div>

      {notice ? (
        <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}
      {!canManageBroadcast ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          Seu perfil pode visualizar a transmissão, mas não pode alterar configurações, reenviar estado ou administrar tokens.
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Status da transmissão">
        {[
          ["Estado", state?.status ?? "—"],
          ["Lote atual", stateLabel(state)],
          ["Versão", state?.version ?? "—"],
          ["Clientes conectados", clients.length],
        ].map(([labelText, value]) => (
          <article key={labelText} className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {labelText}
            </p>
            <p className="mt-2 truncate text-lg font-bold" title={String(value)}>
              {value}
            </p>
          </article>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <section className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6" aria-labelledby="broadcast-preview-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Preview</p>
              <h2 id="broadcast-preview-title" className="mt-1 text-xl font-bold">Mesmo overlay do OBS</h2>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">admin-preview</span>
          </div>
          <div className="relative mt-5 aspect-video overflow-hidden rounded-xl bg-[#10251d]">
            {previewToken ? (
              <BroadcastOverlay
                auctionId={auctionId}
                token={previewToken}
                clientId="admin-preview"
                contained
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">
                Crie um token de leitura para visualizar o overlay ao vivo.
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6" aria-labelledby="broadcast-config-title">
            <h2 id="broadcast-config-title" className="text-xl font-bold">Configuração</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="text-sm font-semibold">
                Delay do overlay (ms)
                <input
                  value={delay}
                  onChange={(event) => setDelay(event.target.value)}
                  inputMode="numeric"
                  min={0}
                  max={30000}
                  type="number"
                  disabled={!canManageBroadcast}
                  className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="text-sm font-semibold">
                Máximo de lances recentes
                <input
                  value={maxRecentBids}
                  onChange={(event) => setMaxRecentBids(event.target.value)}
                  inputMode="numeric"
                  min={1}
                  max={50}
                  type="number"
                  disabled={!canManageBroadcast}
                  className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={updateConfig}
              disabled={isPending || !canManageBroadcast}
              className="mt-4 w-full rounded-lg border border-secondary px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 disabled:opacity-50"
            >
              Salvar configuração
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Configuração atual: {config.overlayDelayMs} ms · {config.maxRecentBids} lances
            </p>
          </section>

          <section className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6" aria-labelledby="broadcast-token-title">
            <h2 id="broadcast-token-title" className="text-xl font-bold">URL do OBS</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_7rem]">
              <label className="text-sm font-semibold">
                Identificador
                <input value={label} onChange={(event) => setLabel(event.target.value)} disabled={!canManageBroadcast} className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </label>
              <label className="text-sm font-semibold">
                Dias
                <input value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)} type="number" min={1} max={365} disabled={!canManageBroadcast} className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </label>
            </div>
            <button type="button" onClick={createToken} disabled={isPending || !canManageBroadcast} className="mt-4 w-full rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              Criar token de leitura
            </button>
            {overlayUrl ? (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground" htmlFor="obs-overlay-url">URL para copiar</label>
                <input id="obs-overlay-url" readOnly value={overlayUrl} onFocus={(event) => event.currentTarget.select()} className="h-10 w-full rounded-lg border bg-muted px-3 text-xs outline-none" />
                <button type="button" onClick={() => void navigator.clipboard?.writeText(overlayUrl)} className="text-sm font-semibold text-secondary underline-offset-4 hover:underline">Copiar URL</button>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-4 shadow-xs sm:p-6" aria-labelledby="broadcast-clients-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="broadcast-clients-title" className="text-xl font-bold">Clientes conectados</h2>
          <span className="text-sm text-muted-foreground">{clients.length} online</span>
        </div>
        <div className="mt-4 divide-y rounded-lg border">
          {clients.length > 0 ? clients.map((client) => (
            <div key={`${client.auctionId}-${client.clientId}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-semibold">{client.clientId}</span>
              <span className="text-muted-foreground">última comunicação: {formatDate(client.lastCommunicationAt)}</span>
            </div>
          )) : <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum overlay conectado.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-4 shadow-xs sm:p-6" aria-labelledby="broadcast-tokens-title">
        <h2 id="broadcast-tokens-title" className="text-xl font-bold">Tokens emitidos</h2>
        <div className="mt-4 divide-y rounded-lg border">
          {tokens.length > 0 ? tokens.map((token) => (
            <div key={token.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold">{token.clientLabel || "sem identificação"}</p>
                <p className="text-xs text-muted-foreground">Expira em {formatDate(token.expiresAt)} · usado: {formatDate(token.lastUsedAt)}</p>
              </div>
              <button type="button" onClick={() => revokeToken(token.id)} disabled={Boolean(token.revokedAt) || isPending || !canManageBroadcast} className="rounded-md border px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40">
                {token.revokedAt ? "Revogado" : "Revogar"}
              </button>
            </div>
          )) : <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum token emitido.</p>}
        </div>
      </section>
    </div>
  );
}
