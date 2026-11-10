import { describe, expect, it } from 'vitest';

import { buildStockEntry } from '@/test/factories';

import { moveFormOf, moveFormSchema, toMoveRequest } from './move-form';

const ENTRY = buildStockEntry({ version: 4 });

describe('moveFormOf', () => {
  it('starts where the cacao is now', () => {
    expect(moveFormOf(ENTRY)).toEqual({
      warehouse_id: 'w1',
      location: 'Estante 3',
    });
  });
});

describe('moveFormSchema', () => {
  const issues = (values: { warehouse_id: string; location: string }) =>
    moveFormSchema
      .safeParse(values)
      .error?.issues.map(({ path, message }) => [path[0], message]);

  it('asks for the warehouse and not for the location', () => {
    expect(issues({ warehouse_id: '', location: '  ' })).toEqual([
      ['warehouse_id', 'Elija la bodega'],
    ]);
    expect(issues({ warehouse_id: 'w2', location: '' })).toBeUndefined();
  });

  it('refuses a location longer than sixty', () => {
    expect(issues({ warehouse_id: 'w2', location: 'x'.repeat(61) })).toEqual([
      ['location', 'Máximo 60 caracteres.'],
    ]);
  });
});

describe('toMoveRequest', () => {
  it('sends the new place with the version of the entry that was read', () => {
    expect(
      toMoveRequest({ warehouse_id: 'w2', location: ' Zona B ' }, ENTRY),
    ).toEqual({ expected_version: 4, warehouse_id: 'w2', location: 'Zona B' });
  });

  it('moves inside the same warehouse when only the location changes', () => {
    expect(
      toMoveRequest({ warehouse_id: 'w1', location: 'Estante 9' }, ENTRY),
    ).toEqual({
      expected_version: 4,
      warehouse_id: 'w1',
      location: 'Estante 9',
    });
  });

  it('can take the location off', () => {
    expect(
      toMoveRequest({ warehouse_id: 'w1', location: '  ' }, ENTRY),
    ).toEqual({ expected_version: 4, warehouse_id: 'w1', location: '' });
  });

  it('sends nothing when the cacao stays where it is', () => {
    expect(
      toMoveRequest({ warehouse_id: 'w1', location: ' Estante 3 ' }, ENTRY),
    ).toBeNull();
  });
});
