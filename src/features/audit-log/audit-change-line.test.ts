import { describe, expect, it } from 'vitest';

import { buildAuditChange } from '@/test/factories';

import { changeLine, EMPTY_VALUE, HIDDEN_TEXT } from './audit-change-line';

describe('changeLine', () => {
  it('shows the previous and the new value of an edit, formatted by kind', () => {
    expect(changeLine(buildAuditChange())).toEqual({
      label: 'Peso en verde (kg)',
      mode: 'updated',
      before: '120,5',
      after: '125,0',
      note: null,
    });
  });

  it('shows only the new value of a field that had none, as in a new record', () => {
    expect(
      changeLine(
        buildAuditChange({
          label: 'Nombre',
          kind: 'text',
          before: null,
          after: 'Bodega principal',
        }),
      ),
    ).toEqual({
      label: 'Nombre',
      mode: 'created',
      before: null,
      after: 'Bodega principal',
      note: null,
    });
  });

  it('shows only the previous value of a field that was emptied, as in a deleted record', () => {
    expect(
      changeLine(
        buildAuditChange({
          label: 'Nombre',
          kind: 'text',
          before: 'Abono orgánico',
          after: null,
        }),
      ),
    ).toMatchObject({
      mode: 'deleted',
      before: 'Abono orgánico',
      after: null,
    });
  });

  it('says a personal field changed, without its values', () => {
    expect(
      changeLine(
        buildAuditChange({
          label: 'Teléfono',
          kind: 'text',
          before: null,
          after: null,
          hidden: 'personal',
        }),
      ),
    ).toEqual({
      label: 'Teléfono',
      mode: 'hidden',
      before: null,
      after: null,
      note: 'modificado',
    });
  });

  it('says the polygon changed, without drawing it as a value', () => {
    expect(changeLine(buildAuditChange({ hidden: 'not_shown' })).note).toBe(
      HIDDEN_TEXT.not_shown,
    );
    expect(HIDDEN_TEXT.not_shown).toBe('modificado');
  });

  it('says when a value was never recorded', () => {
    expect(changeLine(buildAuditChange({ hidden: 'not_recorded' })).note).toBe(
      'modificado (valor no registrado)',
    );
  });

  it('never shows a hidden value, even if one came', () => {
    expect(
      changeLine(
        buildAuditChange({ before: '1', after: '2', hidden: 'personal' }),
      ),
    ).toMatchObject({ before: null, after: null });
  });

  it('writes a dash when neither side has a value', () => {
    expect(
      changeLine(buildAuditChange({ before: null, after: null })),
    ).toMatchObject({ mode: 'updated', before: null, after: EMPTY_VALUE });
  });
});
