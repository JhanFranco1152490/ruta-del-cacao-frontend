import { describe, expect, it } from 'vitest';

import { buildAgriculturalInput, buildInputStock } from '@/test/factories';

import { buildInputRows } from './input-rows';

const urea = buildAgriculturalInput({ id: 'urea', name: 'Urea 46 %' });
const sulfur = buildAgriculturalInput({
  id: 'sulfur',
  name: 'Azufre',
  input_type: 'fungicide',
  is_active: false,
});
const all = { search: '', type: '', status: 'all' } as const;

describe('buildInputRows', () => {
  it('joins each input with its stock in the farm', () => {
    const rows = buildInputRows(
      [urea, sulfur],
      [buildInputStock({ input_id: 'urea', quantity: '-20.000' })],
      all,
    );

    expect(rows.map((row) => [row.input.id, row.quantity])).toEqual([
      ['urea', '-20.000'],
      ['sulfur', null],
    ]);
  });

  it('keeps the order of the catalog and applies the filters', () => {
    const rows = buildInputRows([urea, sulfur], [], {
      ...all,
      status: 'active',
    });

    expect(rows.map((row) => row.input.id)).toEqual(['urea']);
  });

  it('finds an input by a normalized name', () => {
    const rows = buildInputRows([urea, sulfur], [], {
      ...all,
      search: 'urea46',
    });

    expect(rows.map((row) => row.input.id)).toEqual(['urea']);
  });
});
