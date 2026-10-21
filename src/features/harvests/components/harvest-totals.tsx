import { SummaryItem, SummaryStrip } from '@/components/summary-strip';
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
    <SummaryStrip label="Totales del mes">
      <SummaryItem title={`Recolectado en ${formatMonthYear(month)}`}>
        <p className="text-xl font-bold text-selva sm:text-2xl">
          {kg(totals.kg)} en verde
        </p>
        <p className="text-sm">{harvestsWord(totals.count)}</p>
        {waiting > 0 && (
          <p className="mt-1 text-sm font-bold text-warn">
            Y {waiting === 1 ? '1 más espera' : `${waiting} más esperan`} en
            este teléfono.
          </p>
        )}
      </SummaryItem>
      <SummaryItem title="Sin lote">
        <p className="text-xl font-bold text-selva sm:text-2xl">
          {lotWord(totals.withoutLot.count)} · {kg(totals.withoutLot.kg)}
        </p>
        <p className="text-sm">Listas para formar un lote</p>
      </SummaryItem>
      <SummaryItem title="Por variedad">
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
      </SummaryItem>
    </SummaryStrip>
  );
}
