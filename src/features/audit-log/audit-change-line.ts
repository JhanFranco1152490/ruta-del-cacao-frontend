import type { AuditChange, AuditHiddenReason } from './api';
import { formatAuditValue } from './audit-values';

export const EMPTY_VALUE = '—';

// Un dato personal y el polígono de una parcela dicen solo que cambiaron; lo guardado antes de que
// el historial tuviera valores, además, que no se registró.
export const HIDDEN_TEXT: Record<AuditHiddenReason, string> = {
  personal: 'modificado',
  not_shown: 'modificado',
  not_recorded: 'modificado (valor no registrado)',
};

// `created`: el campo no tenía valor (un alta, o uno que se llenó); `deleted`: se quedó sin él (una
// eliminación, o uno que se vació). Se decide por cada campo y no por la acción, porque cada módulo
// nombra las suyas a su manera («started», «entered», «turn_created»…).
export type ChangeMode = 'updated' | 'created' | 'deleted' | 'hidden';

export type ChangeLine = {
  label: string;
  mode: ChangeMode;
  before: string | null;
  after: string | null;
  note: string | null;
};

export function changeLine(change: AuditChange): ChangeLine {
  const { label, hidden } = change;
  if (hidden) {
    return {
      label,
      mode: 'hidden',
      before: null,
      after: null,
      note: HIDDEN_TEXT[hidden],
    };
  }
  const before = formatAuditValue(change.before, change.kind);
  const after = formatAuditValue(change.after, change.kind);
  if (before === null && after !== null) {
    return { label, mode: 'created', before: null, after, note: null };
  }
  if (before !== null && after === null) {
    return { label, mode: 'deleted', before, after: null, note: null };
  }
  return {
    label,
    mode: 'updated',
    before,
    after: after ?? EMPTY_VALUE,
    note: null,
  };
}
