import {
  formatDateTime,
  formatLongDate,
  formatShortDayMonth,
} from '@/lib/format/dates';

import type { LotHistoryStage } from '../api';

// La fecha de una entrada, con el año: la historia se consulta meses después, al vender. Con hora
// si la etapa la guarda; la cosecha, el ingreso, una salida y una venta solo tienen fecha.
export const stageDateText = ({
  occurred_on,
  occurred_at,
}: Pick<LotHistoryStage, 'occurred_on' | 'occurred_at'>) =>
  occurred_at ? formatDateTime(occurred_at) : formatLongDate(occurred_on);

const daysText = (days: number) => (days === 1 ? '1 día' : `${days} días`);

// El tramo de una etapa con duración: «15 mar → 21 mar · 6 días» o, mientras sigue, «Desde el
// 15 mar, en curso · 3 días».
export function stageSpanText({
  started_at,
  ended_at,
  days,
}: {
  started_at: string;
  ended_at: string | null;
  days: number;
}) {
  const start = formatShortDayMonth(started_at);
  if (!ended_at) return `Desde el ${start}, en curso · ${daysText(days)}`;
  return `${start} → ${formatShortDayMonth(ended_at)} · ${daysText(days)}`;
}
