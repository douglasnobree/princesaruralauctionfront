import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EngineCommandFeedback({
  message,
  code,
  correlationId,
  onRefresh,
}: {
  message: string;
  code?: string;
  correlationId?: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive" role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Vamos ajustar isso antes de continuar</p>
          <p className="mt-1 text-sm leading-6">{message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {onRefresh ? <Button type="button" variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="size-4" />Atualizar estado</Button> : null}
            {code || correlationId ? <details className="text-xs text-destructive/80"><summary className="cursor-pointer select-none">Ver detalhes técnicos</summary><div className="mt-2 space-y-1 font-mono">{code ? <p>Código: {code}</p> : null}{correlationId ? <p>Referência: {correlationId}</p> : null}</div></details> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
