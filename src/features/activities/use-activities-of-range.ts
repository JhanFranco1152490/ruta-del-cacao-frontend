'use client';

import { useQueries } from '@tanstack/react-query';

import { isNetworkFailure } from '@/lib/api/errors';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { activityMonthQuery, type AgriculturalActivity } from './api';

export type ActivityRangeRead = {
  // Lo que hay de todos los meses leídos, una sola vez cada actividad.
  activities: AgriculturalActivity[];
  // La fecha de la copia más vieja de las que se usaron en lugar de la red; vacío si todo llegó
  // del servidor.
  savedAt: number | undefined;
  // Todavía espera la respuesta de algún mes.
  isPending: boolean;
  // Meses sin copia en el dispositivo y sin red para leerlos.
  unavailable: string[];
  // El primer error del servidor, distinto de no tener red.
  error: unknown;
  refetch: () => void;
};

// Las actividades de varios meses (yyyy-MM) juntas: una semana o una cuadrícula cruzan el límite
// de un mes. Usa la misma lectura y la misma copia de cada mes que la vista de un mes, así que no
// hay endpoint ni copia nueva. Una actividad reprogramada de un mes a otro puede seguir en la copia
// vieja del primero; vale la de la versión más reciente.
export function useActivitiesOfRange(
  userId: string | undefined,
  months: readonly string[],
  producer: string | null,
): ActivityRangeRead {
  return useQueries({
    queries: months.map((month) => activityMonthQuery(userId, month, producer)),
    combine: (results) => {
      const newest = new Map<string, AgriculturalActivity>();
      const unavailable: string[] = [];
      const copies: number[] = [];
      let error: unknown = null;
      results.forEach((result, index) => {
        if (result.data) {
          for (const activity of result.data.data) {
            const known = newest.get(activity.id);
            if (!known || known.version < activity.version) {
              newest.set(activity.id, activity);
            }
          }
          if (result.data.savedAt !== undefined) {
            copies.push(result.data.savedAt);
          }
        } else if (
          isPausedWithoutData(result) ||
          (result.isError && isNetworkFailure(result.error))
        ) {
          unavailable.push(months[index]);
        } else if (result.isError) {
          error ??= result.error;
        }
      });
      return {
        activities: [...newest.values()].sort((a, b) =>
          a.scheduled_date.localeCompare(b.scheduled_date),
        ),
        savedAt: copies.length > 0 ? Math.min(...copies) : undefined,
        isPending: results.some(
          (result) => result.isPending && !isPausedWithoutData(result),
        ),
        unavailable,
        error,
        refetch: () => results.forEach((result) => void result.refetch()),
      };
    },
  });
}
