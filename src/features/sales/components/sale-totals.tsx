import { formatPesos } from '@/lib/format/pesos';
import { fromTenths } from '@/lib/format/tenths';
import { kilosText } from '@/lib/stock-quantity';

// El valor total y los kilos de cada calibre de lo escrito, que cambian al escribir. Va en el
// resumen de la venta: a un lado en escritorio y, en celular, debajo de las líneas y no pegado sobre
// la barra de guardar, que a 360 px tapaba los kilos y el precio de la línea que se estaba escribiendo.
export function SaleTotals({
  total,
  g1Tenths,
  g2Tenths,
  lineCount,
}: {
  total: number;
  g1Tenths: number;
  g2Tenths: number;
  // Cuántas líneas ya cuentan (las que tienen kilos y precio).
  lineCount: number;
}) {
  return (
    <div
      aria-label="Valor de la venta"
      className="rounded-lg bg-[var(--cobre-tint)] p-4"
      role="status"
    >
      <p className="text-sm font-bold text-selva">Valor total</p>
      <p className="font-serif text-3xl text-selva tabular-nums">
        {formatPesos(total)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Kg de G1</dt>
          <dd className="font-bold tabular-nums">
            {kilosText(fromTenths(g1Tenths))}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Kg de G2</dt>
          <dd className="font-bold tabular-nums">
            {kilosText(fromTenths(g2Tenths))}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        {lineCount === 1 ? '1 línea' : `${lineCount} líneas`} con valor
      </p>
    </div>
  );
}
