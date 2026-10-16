import { formatDecimal } from '@/lib/format/decimal';
import { formatMonthYear } from '@/lib/format/dates';

import type { harvestTotals } from '../harvest-filters';

const kg = (value: string) => `${formatDecimal(value, 1)} kg`;
const harvestsWord = (count: number) =>
  count === 1 ? '1 recolección' : `${count} recolecciones`;
const lotWord = (count: number) =>
  count === 1 ? '1 cosecha' : `${count} cosechas`;

// Lo que se recogió en el mes con los filtros puestos: el total, lo que falta por conformar en
// lotes y cuánto dio cada variedad. Cuenta lo que ya llegó al servidor; lo que espera en el
// teléfono se nombra aparte, porque aún no se sabe su variedad.
export function HarvestTotals({
  month,
  totals,
  waiting,
}: {
  month: string;
  totals: ReturnType<typeof harvestTotals>;
  waiting: number;
}) {
  return (
    <section aria-label="Totales del mes" className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-(--radius) border bg-card p-4">
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          Recolectado en {formatMonthYear(month)}
        </p>
        <p className="text-2xl font-bold text-selva">
          {kg(totals.kg)} en verde
        </p>
        <p className="text-sm">{harvestsWord(totals.count)}</p>
        {waiting > 0 && (
          <p className="mt-1 text-sm font-bold text-warn">
            Y {waiting === 1 ? '1 más espera' : `${waiting} más esperan`} en
            este teléfono.
          </p>
        )}
      </div>
      <div className="rounded-(--radius) border bg-card p-4">
        <p className="text-sm text-muted-foreground">Sin lote</p>
        <p className="text-2xl font-bold text-selva">
          {lotWord(totals.withoutLot.count)} · {kg(totals.withoutLot.kg)}
        </p>
        <p className="text-sm">Listas para formar un lote</p>
      </div>
      <div className="rounded-(--radius) border bg-card p-4">
        <p className="text-sm text-muted-foreground">Por variedad</p>
        {totals.byVariety.length === 0 ? (
          <p className="text-sm">Sin cosechas</p>
        ) : (
          <ul className="space-y-0.5 text-sm">
            {totals.byVariety.map(({ id, name, kg: weight }) => (
              <li className="flex justify-between gap-3" key={id}>
                <span>{name}</span>
                <span className="font-bold tabular-nums">{kg(weight)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
