import { describe, expect, it } from 'vitest';

import {
  onlyFarmOf,
  effectiveScope,
  ONE_FARM_REQUIRED,
  SCOPE_CONFLICT,
  SCOPE_REQUIRED,
  scopeBody,
  scopeOfRoles,
  scopeProblem,
} from './farm-scope';

const esperanza = {
  id: 'farm-a',
  code: 'F01',
  name: 'La Esperanza',
  is_active: true,
};
const recreo = {
  id: 'farm-b',
  code: 'F01',
  name: 'El Recreo',
  is_active: true,
};

describe('onlyFarmOf', () => {
  it('es la finca de quien trabaja en una sola', () => {
    expect(
      onlyFarmOf({ producer_id: 'p1', all_farms: false, farms: [esperanza] }),
    ).toBe(esperanza);
  });

  it('no fija nada a quien alcanza todas o atiende varias', () => {
    expect(
      onlyFarmOf({ producer_id: 'p1', all_farms: true, farms: [] }),
    ).toBeNull();
    expect(
      onlyFarmOf({
        producer_id: 'p1',
        all_farms: false,
        farms: [esperanza, recreo],
      }),
    ).toBeNull();
    expect(
      onlyFarmOf({ producer_id: 'p1', all_farms: false, farms: [] }),
    ).toBeNull();
    expect(onlyFarmOf(undefined)).toBeNull();
  });
});

describe('el alcance que piden los roles', () => {
  it('«todas» o «una sola» mandan sobre «varias», y pedir las dos es un choque', () => {
    expect(scopeOfRoles([])).toBe('many');
    expect(scopeOfRoles([{ farm_scope: 'many' }, { farm_scope: 'one' }])).toBe(
      'one',
    );
    expect(scopeOfRoles([{ farm_scope: 'many' }, { farm_scope: 'all' }])).toBe(
      'all',
    );
    expect(scopeOfRoles([{ farm_scope: 'all' }, { farm_scope: 'one' }])).toBe(
      'conflict',
    );
    // Un rol sin alcance (Productor, Administrador) no pide nada.
    expect(scopeOfRoles([{ farm_scope: null }])).toBe('many');
  });

  it('con «todas» el alcance es siempre todas y con «una sola» nunca lo es', () => {
    const some = { all_farms: false, farm_ids: ['a'] };
    expect(effectiveScope('all', some)).toEqual({
      all_farms: true,
      farm_ids: [],
    });
    expect(effectiveScope('one', { all_farms: true, farm_ids: [] })).toEqual({
      all_farms: false,
      farm_ids: [],
    });
    expect(effectiveScope('many', some)).toEqual(some);
  });

  it('dice por qué un alcance no sirve', () => {
    const none = { all_farms: false, farm_ids: [] };
    expect(scopeProblem('many', none)).toBe(SCOPE_REQUIRED);
    expect(scopeProblem('many', { all_farms: true, farm_ids: [] })).toBeNull();
    expect(
      scopeProblem('one', { all_farms: false, farm_ids: ['a', 'b'] }),
    ).toBe(ONE_FARM_REQUIRED);
    expect(
      scopeProblem('one', { all_farms: false, farm_ids: ['a'] }),
    ).toBeNull();
    expect(scopeProblem('all', none)).toBeNull();
    expect(scopeProblem('conflict', none)).toBe(SCOPE_CONFLICT);
  });

  it('envía las fincas o «todas», nunca las dos', () => {
    expect(scopeBody({ all_farms: true, farm_ids: ['a'] })).toEqual({
      all_farms: true,
    });
    expect(scopeBody({ all_farms: false, farm_ids: ['a'] })).toEqual({
      farm_ids: ['a'],
    });
  });
});
