// Lo que va debajo de los filtros. Un reporte solo se muestra mientras corresponde a los filtros de
// arriba (`generated`): una consulta anterior guardada no cuenta.
export type ReportContent =
  'session' | 'no-types' | 'not-generated' | 'loading' | 'error' | 'report';

export function reportContent({
  sessionPending,
  hasTypes,
  generated,
  valid,
  pending,
  notice,
  hasReport,
}: {
  sessionPending: boolean;
  hasTypes: boolean;
  generated: boolean;
  valid: boolean;
  pending: boolean;
  // El aviso de un rechazo que no es de un filtro (sin permiso, demasiadas filas, sin red).
  notice: string | null;
  hasReport: boolean;
}): ReportContent {
  if (sessionPending) return 'session';
  if (!hasTypes) return 'no-types';
  if (!generated || !valid) return 'not-generated';
  if (pending) return 'loading';
  if (notice) return 'error';
  // Rechazado en un filtro: el error está en el campo y la pantalla espera otro intento.
  return hasReport ? 'report' : 'not-generated';
}
