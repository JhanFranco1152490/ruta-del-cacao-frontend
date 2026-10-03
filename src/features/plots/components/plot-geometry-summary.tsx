import { formatHectares } from '@/lib/format/hectares';

// El área calculada y el perímetro del polígono, que se actualizan mientras se dibuja. El
// perímetro no se guarda: es solo una ayuda para quien recorre la parcela.
export function PlotGeometrySummary({
  measuredAreaHectares,
  perimeterMetres,
}: {
  measuredAreaHectares: number | null;
  perimeterMetres: number | null;
}) {
  return (
    <dl
      aria-live="polite"
      className="grid grid-cols-2 gap-4 rounded-[var(--radius-card)] border border-border bg-card p-4"
    >
      <div>
        <dt className="text-sm text-muted-foreground">Área calculada</dt>
        <dd className="text-xl font-bold text-selva">
          {measuredAreaHectares === null
            ? '—'
            : formatHectares(measuredAreaHectares.toFixed(4))}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">Perímetro</dt>
        <dd className="text-xl font-bold text-selva">
          {perimeterMetres === null
            ? '—'
            : `${Math.round(perimeterMetres).toLocaleString('es')} m`}
        </dd>
      </div>
    </dl>
  );
}
