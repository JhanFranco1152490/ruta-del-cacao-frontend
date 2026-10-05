import { formatMonthYear } from '@/lib/format/dates';

import { formatCount, type Stage } from './characterization-rules';
import { stageLabel } from './characterization-summary';

type Params = {
  // El nombre con el que se muestra la variedad elegida; vacío si todavía no hay.
  variety: string;
  month: string;
  trees: string;
  stage: Stage | '';
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

// Lo que se ve de una siembra cuando su fila está colapsada: lo que ya se llenó, en una línea.
export function plantingLineSummary({
  variety,
  month,
  trees,
  stage,
}: Params): string {
  const count = /^\d+$/.test(trees.trim()) ? Number(trees) : null;
  const parts = [
    variety,
    MONTH.test(month) ? formatMonthYear(month) : '',
    count === null
      ? ''
      : `${formatCount(count)} ${count === 1 ? 'árbol' : 'árboles'}`,
    stage ? stageLabel(stage) : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Sin completar';
}
