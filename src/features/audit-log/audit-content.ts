export type AuditContent =
  | 'needs-producer'
  | 'invalid-period'
  | 'loading'
  | 'error'
  | 'filter-error'
  | 'empty'
  | 'empty-filtered'
  | 'list';

export type AuditContentInput = {
  // La cuenta técnica todavía no eligió de quién ver la bitácora.
  needsProducer: boolean;
  periodInvalid: boolean;
  pending: boolean;
  notice: string | null;
  filterError: string | null;
  total: number;
  filtered: boolean;
};

// Lo que va debajo de los filtros. Sin productor o con el periodo al revés no se pidió nada, así
// que no hay carga ni vacío que mostrar.
export function auditContent(input: AuditContentInput): AuditContent {
  if (input.needsProducer) return 'needs-producer';
  if (input.periodInvalid) return 'invalid-period';
  if (input.pending) return 'loading';
  if (input.notice) return 'error';
  if (input.filterError) return 'filter-error';
  if (input.total === 0) return input.filtered ? 'empty-filtered' : 'empty';
  return 'list';
}
