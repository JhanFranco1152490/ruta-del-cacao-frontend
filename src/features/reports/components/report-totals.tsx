import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

import type { ReportTotal } from '../api';
import { lastItemSpan, totalItems } from '../report-total-items';

// Tailwind solo ve clases escritas completas: por eso la tabla y no una cadena armada.
const SPAN_CLASS: Record<number, string> = {
  1: '',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
};

// Los totales del reporte, tal como los calcula el servidor (aquí solo se les da formato). La última
// cifra ocupa lo que sobra de su fila, en escritorio y en celular (dos columnas).
export function ReportTotals({ totals }: { totals: readonly ReportTotal[] }) {
  const items = totalItems(totals);
  const wide = items.length > 3;
  const columns = wide ? 4 : 3;
  const span = SPAN_CLASS[lastItemSpan(items.length, columns)];
  const mobileSpan = wide && items.length % 2 === 1 ? 'max-sm:col-span-2' : '';
  return (
    <SummaryStrip columns={columns} compact={wide} label="Totales del reporte">
      {items.map(({ key, title, value, detail }, index) => (
        <SummaryValue
          className={index === items.length - 1 ? `${span} ${mobileSpan}` : ''}
          detail={detail}
          key={key}
          title={title}
          value={value}
        />
      ))}
    </SummaryStrip>
  );
}
