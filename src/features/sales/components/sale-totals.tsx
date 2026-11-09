import { formatPesos } from '@/lib/format/pesos';
import { fromTenths } from '@/lib/format/tenths';
import { kilosText } from '@/lib/stock-quantity';

// El valor total y los kilos de cada calibre de lo escrito, que cambian al escribir. Va debajo de
// las líneas y no pegado sobre la barra de guardar: a 360 px pegado tapaba los kilos y el precio de
// la línea que se estaba escribiendo.
export function SaleTotals({
  total,
  g1Tenths,
  g2Tenths,
}: {
  total: number;
  g1Tenths: number;
  g2Tenths: number;
}) {
  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg bg-[var(--cobre-tint)] px-4 py-3"
    >
      <p className="text-lg font-bold text-selva">
        Valor total: <span className="tabular-nums">{formatPesos(total)}</span>
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        G1 {kilosText(fromTenths(g1Tenths))} kg · G2{' '}
        {kilosText(fromTenths(g2Tenths))} kg
      </p>
    </div>
  );
}
