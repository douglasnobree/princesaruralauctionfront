"use client";
export default function ManagementError({ reset }: { reset: () => void }) {
  return <section role="alert" className="rounded-xl border bg-card p-6"><h1 className="text-xl font-bold">Não foi possível carregar esta seção</h1><p className="mt-2 text-sm text-muted-foreground">Tente novamente. Se o problema continuar, confira sua conexão.</p><button type="button" onClick={reset} className="mt-5 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Tentar novamente</button></section>;
}
