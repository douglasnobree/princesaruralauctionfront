import { LockKeyhole } from "lucide-react";
import Link from "next/link";

export function AccessDenied({ title = "Acesso restrito", message = "Seu perfil está autenticado, mas não possui a permissão necessária para esta operação." }: { title?: string; message?: string }) {
  return <section className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-950 shadow-sm" role="alert"><div className="flex items-start gap-4"><LockKeyhole className="mt-0.5 size-6 shrink-0 text-amber-700" aria-hidden="true" /><div><h1 className="text-xl font-semibold">{title}</h1><p className="mt-2 text-sm leading-6 text-amber-900/80">{message}</p><Link className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2" href="/admin/leiloes">Voltar aos leilões</Link></div></div></section>;
}
