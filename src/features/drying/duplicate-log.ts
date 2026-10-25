import { dateInBogota, formatShortDayMonth } from '@/lib/format/dates';

// El servidor no acepta dos bitácoras de un lote en la misma fecha: es una por día de secado. Aquí
// se avisa antes de guardar con lo que el dispositivo conoce (la copia y la cola); la respuesta del
// servidor manda.
export function sameDateLog<T extends { id: string; measured_at: string }>(
  logs: readonly T[],
  measuredAt: string,
  exceptId?: string,
) {
  const date = dateInBogota(measuredAt);
  return logs.find(
    ({ id, measured_at }) =>
      id !== exceptId && dateInBogota(measured_at) === date,
  );
}

export const DUPLICATE_LOG_MESSAGE = 'Ya existe un registro para esta fecha';

export const duplicateLogDetail = (measuredAt: string) =>
  `${DUPLICATE_LOG_MESSAGE} (${formatShortDayMonth(measuredAt)}.)`;
