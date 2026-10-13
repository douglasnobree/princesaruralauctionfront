import { explainEngineError, getEngineErrorCode } from "@/lib/auctions/engine-errors";

// Reads use GET so background updates never queue behind a server action.
export async function managerRead<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/auction-engine/${path}`, { cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(response.status === 401
      ? "Sua sessão expirou. Entre novamente para continuar."
      : response.status === 403 ? "Seu perfil não tem permissão para esta consulta."
      : explainEngineError(getEngineErrorCode(payload), "Não foi possível atualizar os dados. Tente novamente."));
  }
  return response.json() as Promise<T>;
}
