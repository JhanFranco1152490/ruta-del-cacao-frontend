import { isApiError } from '@/lib/api/errors';

export type TraceabilityProblem = 'not_found' | 'too_many' | 'failed';

// Qué le pasó a quien escaneó el código. Un código mal formado y uno que no existe dan el mismo 404
// y por eso se dicen igual: la página no revela cuál de los dos fue.
export function traceabilityProblem(error: unknown): TraceabilityProblem {
  if (isApiError(error)) {
    if (error.status === 404) return 'not_found';
    if (error.status === 429) return 'too_many';
  }
  return 'failed';
}

export const TRACEABILITY_PROBLEM_TEXT: Record<
  TraceabilityProblem,
  { title: string; description?: string }
> = {
  not_found: {
    title: 'No se encontró información para este código.',
    description: 'Revisa que el código esté completo o escanéalo de nuevo.',
  },
  too_many: {
    title: 'Hiciste muchas consultas seguidas. Intenta de nuevo en un minuto.',
  },
  failed: {
    title:
      'No pudimos cargar la información. Revisa tu conexión e intenta de nuevo.',
  },
};
