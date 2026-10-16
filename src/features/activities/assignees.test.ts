import { describe, expect, it } from 'vitest';

import { buildAssignee } from '@/test/factories';

import { assigneeNote, OUTSIDE_FARM } from './assignees';

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

describe('assigneeNote, with an account without scope', () => {
  it('marks it out of the farm', () => {
    const noScope = buildAssignee({
      id: 'noScope',
      all_farms: false,
      farm_ids: [],
    });

    expect(
      assigneeNote(
        { id: 'noScope', full_name: 'X', is_active: true },
        'farm-a',
        [noScope],
      ),
    ).toBe(OUTSIDE_FARM);
  });
});

describe('assigneeNote', () => {
  const current = { id: 'x', full_name: 'Luis', is_active: true };

  it('avisa de la cuenta inactiva, aunque la lista no haya llegado', () => {
    expect(
      assigneeNote({ ...current, is_active: false }, 'farm-a', undefined),
    ).toBe('Cuenta inactiva');
  });

  it('sin la lista no advierte nada más', () => {
    expect(assigneeNote(current, 'farm-a', undefined)).toBe('');
  });

  it('no advierte nada de quien trabaja en la finca ni del productor', () => {
    const asForeman = [{ ...owner, assignable: false }, here];

    expect(assigneeNote({ ...current, id: 'here' }, 'farm-a', asForeman)).toBe(
      '',
    );
    expect(assigneeNote({ ...current, id: 'owner' }, 'farm-a', asForeman)).toBe(
      '',
    );
    expect(assigneeNote({ ...current, id: 'both' }, 'farm-b', accounts)).toBe(
      '',
    );
  });

  it('marca a quien es de otra finca, no está en la lista o perdió el permiso', () => {
    expect(
      assigneeNote({ ...current, id: 'elsewhere' }, 'farm-a', accounts),
    ).toBe(OUTSIDE_FARM);
    expect(assigneeNote(current, 'farm-a', accounts)).toBe(OUTSIDE_FARM);
    expect(assigneeNote({ ...current, id: 'seller' }, 'farm-a', accounts)).toBe(
      OUTSIDE_FARM,
    );
  });
});
