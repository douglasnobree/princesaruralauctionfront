export default function ManagementLoading() {
  return <div role="status" aria-label="Carregando gestão" className="space-y-5"><div className="management-skeleton h-10 w-64 rounded-lg bg-muted" /><div className="management-skeleton h-14 rounded-lg bg-muted" /><div className="management-skeleton h-72 rounded-xl border bg-card" /><span className="sr-only">Carregando…</span></div>;
}
