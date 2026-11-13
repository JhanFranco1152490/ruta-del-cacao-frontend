import type { ReportTotal } from './api';
import { formatCell } from './report-cells';

export type ReportTotalItem = {
  key: string;
  title: string;
  value: string;
  detail?: string;
};

// Las cifras de la franja de totales. Un porcentaje que acompaña a sus kilos (`g1_pct` con `g1_kg`)
// va como línea pequeña debajo de ellos y no como una cifra más: la calidad trae nueve totales y
// así quedan seis.
export function totalItems(totals: readonly ReportTotal[]): ReportTotalItem[] {
  const byKey = new Map(totals.map((total) => [total.key, total]));
  const kgOf = (total: ReportTotal) =>
    total.kind === 'pct' ? byKey.get(total.key.replace(/_pct$/, '_kg')) : null;

  return totals
    .filter((total) => !kgOf(total))
    .map((total) => {
      const share = byKey.get(total.key.replace(/_kg$/, '_pct'));
      const paired = total.kind === 'kg' && share?.kind === 'pct';
      return {
        key: total.key,
        title: total.label,
        value: formatCell(total.value, total.kind, { withUnit: true }),
        detail: paired
          ? formatCell(share.value, 'pct', { withUnit: true })
          : undefined,
      };
    });
}
