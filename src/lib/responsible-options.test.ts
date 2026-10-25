import { describe, expect, it } from 'vitest';

import { responsibleOptions } from './responsible-options';

const people = [
  { id: 'a', full_name: 'Ana', assignable: true },
  { id: 'b', full_name: 'Beto', assignable: false },
];

describe('responsibleOptions', () => {
  it('offers only who can be named', () => {
    expect(responsibleOptions(people)).toEqual([{ id: 'a', label: 'Ana' }]);
  });

  it('keeps the current one, marked when inactive', () => {
    expect(
      responsibleOptions(people, {
        id: 'c',
        full_name: 'Carla',
        is_active: false,
      }),
    ).toEqual([
      { id: 'a', label: 'Ana' },
      { id: 'c', label: 'Carla (Cuenta inactiva)' },
    ]);
  });

  it('does not repeat the current one when it is offered', () => {
    expect(
      responsibleOptions(people, {
        id: 'a',
        full_name: 'Ana',
        is_active: true,
      }),
    ).toHaveLength(1);
  });
});
