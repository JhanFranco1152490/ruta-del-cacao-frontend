import { describe, expect, it } from 'vitest';

import { buildAssignee } from '@/test/factories';

import { assignableIn } from './assignable-accounts';

const owner = buildAssignee({ id: 'owner', full_name: 'Ana Dueña' });
const here = buildAssignee({
  id: 'here',
  all_farms: false,
  farm_ids: ['farm-a'],
});
const elsewhere = buildAssignee({
  id: 'elsewhere',
  all_farms: false,
  farm_ids: ['farm-b'],
});
const seller = buildAssignee({
  id: 'seller',
  all_farms: false,
  farm_ids: ['farm-a'],
  assignable: false,
});
const inactive = buildAssignee({
  id: 'inactive',
  all_farms: false,
  farm_ids: ['farm-a'],
  is_active: false,
});
const both = buildAssignee({
  id: 'both',
  all_farms: false,
  farm_ids: ['farm-a', 'farm-b'],
});
const accounts = [owner, here, elsewhere, seller, inactive, both];

const ids = (list: { id: string }[]) => list.map(({ id }) => id);

describe('assignableIn', () => {
  it('ofrece al productor y a la gente activa de la finca', () => {
    expect(ids(assignableIn(accounts, 'farm-a'))).toEqual([
      'owner',
      'here',
      'both',
    ]);
    // Quien trabaja en dos fincas se ofrece en las dos.
    expect(ids(assignableIn(accounts, 'farm-b'))).toEqual([
      'owner',
      'elsewhere',
      'both',
    ]);
  });

  it('sin finca elegida solo ofrece a quien vale para todas', () => {
    expect(ids(assignableIn(accounts, ''))).toEqual(['owner']);
  });

  it('ofrece en cualquier finca a quien trabaja en todas, y a nadie sin alcance', () => {
    const everywhere = buildAssignee({
      id: 'everywhere',
      all_farms: true,
      farm_ids: [],
    });
    const noScope = buildAssignee({
      id: 'noScope',
      all_farms: false,
      farm_ids: [],
    });

    expect(ids(assignableIn([everywhere, noScope], 'farm-a'))).toEqual([
      'everywhere',
    ]);
  });

  it('no ofrece al productor cuando quien pregunta no puede asignarle', () => {
    const asForeman = [{ ...owner, assignable: false }, here];

    expect(ids(assignableIn(asForeman, 'farm-a'))).toEqual(['here']);
  });
});
