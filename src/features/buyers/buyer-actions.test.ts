import { describe, expect, it } from 'vitest';

import { buyerActions } from './buyer-actions';

const active = { is_active: true, has_records: false };
const all = { canChange: true, canDelete: true };

describe('buyerActions', () => {
  it('gives the producer three actions, in the menu', () => {
    expect(buyerActions(active, all, true)).toEqual({
      actions: [{ kind: 'edit' }, { kind: 'deactivate' }, { kind: 'delete' }],
      inMenu: true,
    });
  });

  it('gives the sales manager two buttons, without delete', () => {
    expect(
      buyerActions(active, { canChange: true, canDelete: false }, true),
    ).toEqual({
      actions: [{ kind: 'edit' }, { kind: 'deactivate' }],
      inMenu: false,
    });
  });

  it('offers activate on an inactive buyer', () => {
    const { actions } = buyerActions(
      { is_active: false, has_records: false },
      all,
      true,
    );
    expect(actions.map((action) => action.kind)).toEqual([
      'edit',
      'activate',
      'delete',
    ]);
  });

  it('shows delete disabled with its reason when the buyer has sales, beside deactivate', () => {
    const { actions } = buyerActions(
      { is_active: true, has_records: true },
      all,
      true,
    );
    expect(actions).toEqual([
      { kind: 'edit' },
      { kind: 'deactivate' },
      {
        kind: 'delete',
        disabledReason: 'No se puede eliminar: tiene ventas registradas.',
      },
    ]);
  });

  it('disables everything without a connection', () => {
    const { actions } = buyerActions(active, all, false);
    expect(actions.every((action) => action.disabledReason)).toBe(true);
    expect(actions[0].disabledReason).toBe(
      'Registrar o cambiar un comprador necesita conexión.',
    );
  });

  it('offers nothing to whoever only reads', () => {
    expect(
      buyerActions(active, { canChange: false, canDelete: false }, true),
    ).toEqual({ actions: [], inMenu: false });
  });
});
