import { describe, expect, it } from 'vitest';

import {
  type CatalogInput,
  inputChoices,
  MISSING_INPUT_MESSAGE,
  MISSING_QUANTITY_MESSAGE,
  REPEATED_INPUT_MESSAGE,
  stockReferenceText,
  usedInputIssues,
  usedInputPhrase,
  usedQuantityText,
} from './input-usage';

const urea = {
  name: 'Urea 46 %',
  unit: 'kg',
  package_type: 'sack',
  package_size: '50.000',
};
const bocashi = {
  name: 'Bocashi',
  unit: 'kg',
  package_type: null,
  package_size: null,
};

const input = (overrides: Partial<CatalogInput>): CatalogInput => ({
  id: 'in1',
  name: 'Urea 46 %',
  unit: 'kg',
  package_type: 'sack',
  package_size: '50.000',
  is_active: true,
  ...overrides,
});

const catalog = [
  input({ id: 'urea', name: 'Urea 46 %' }),
  input({ id: 'copper', name: 'Óxido de cobre' }),
  input({ id: 'old', name: 'Cal agrícola', is_active: false }),
];

describe('usedInputIssues', () => {
  it('accepts no rows and rows with an input and a quantity', () => {
    expect(usedInputIssues([])).toEqual([]);
    expect(
      usedInputIssues([
        { input_id: 'urea', quantity: '100' },
        { input_id: 'copper', quantity: '2.5' },
      ]),
    ).toEqual([]);
  });

  it('wants an input and a quantity in each row', () => {
    expect(usedInputIssues([{ input_id: '', quantity: '' }])).toEqual([
      { index: 0, field: 'input_id', message: MISSING_INPUT_MESSAGE },
      { index: 0, field: 'quantity', message: MISSING_QUANTITY_MESSAGE },
    ]);
  });

  it('marks the second row of a repeated input', () => {
    expect(
      usedInputIssues([
        { input_id: 'urea', quantity: '1' },
        { input_id: 'urea', quantity: '2' },
      ]),
    ).toEqual([
      { index: 1, field: 'input_id', message: REPEATED_INPUT_MESSAGE },
    ]);
  });

  it('wants a quantity above zero with up to three decimals', () => {
    const messageOf = (quantity: string) =>
      usedInputIssues([{ input_id: 'urea', quantity }])[0]?.message;
    expect(messageOf('abc')).toBe('Escribe una cantidad válida');
    expect(messageOf('0')).toBe('La cantidad debe ser mayor que cero');
    expect(messageOf('1.2345')).toBe('Usa máximo 3 decimales');
    expect(messageOf('10000000')).toBe('La cantidad es demasiado grande');
    expect(messageOf('1.234')).toBeUndefined();
  });
});

describe('usedQuantityText', () => {
  it('writes the quantity with its unit and its equivalent in packages', () => {
    expect(usedQuantityText('100', urea)).toBe('100 kg · 2 bultos');
    expect(usedQuantityText('25', bocashi)).toBe('25 kg');
  });

  it('says nothing while the quantity is not a number above zero', () => {
    expect(usedQuantityText('', urea)).toBeNull();
    expect(usedQuantityText('abc', urea)).toBeNull();
    expect(usedQuantityText('0', urea)).toBeNull();
  });

  it('reads the decimal comma', () => {
    expect(usedQuantityText('12,5', bocashi)).toBe('12,5 kg');
  });
});

describe('stockReferenceText', () => {
  it('says what the farm has, only as a reference', () => {
    expect(stockReferenceText('170.000', urea)).toBe('Hay 170 kg · 3,4 bultos');
  });

  it('says that the farm has no movements of the input', () => {
    expect(stockReferenceText(null, urea)).toBe(
      'Sin movimientos en esta finca',
    );
  });

  it('says that more was spent than what came in', () => {
    expect(stockReferenceText('-20.000', urea)).toBe('Hay −20 kg');
  });
});

describe('inputChoices', () => {
  const none = new Set<string>();
  const labels = (options: Parameters<typeof inputChoices>[1]) =>
    inputChoices(catalog, options).map(({ label }) => label);

  it('offers only the active inputs', () => {
    expect(labels({ search: '', selectedId: '', takenIds: none })).toEqual([
      'Urea 46 %',
      'Óxido de cobre',
    ]);
  });

  it('searches without accents, capitals or spaces, like the catalog', () => {
    expect(
      labels({ search: 'oxido  DE', selectedId: '', takenIds: none }),
    ).toEqual(['Óxido de cobre']);
    expect(labels({ search: 'zzz', selectedId: '', takenIds: none })).toEqual(
      [],
    );
  });

  it('keeps the chosen input even when it does not match the search', () => {
    expect(
      labels({ search: 'cobre', selectedId: 'urea', takenIds: none }),
    ).toEqual(['Urea 46 %', 'Óxido de cobre']);
  });

  it('shows an input of another row as already in the list, without letting it be chosen twice', () => {
    expect(
      inputChoices(catalog, {
        search: '',
        selectedId: 'copper',
        takenIds: new Set(['urea', 'copper']),
      }),
    ).toEqual([
      { id: 'urea', label: 'Urea 46 % · Ya en la lista', disabled: true },
      { id: 'copper', label: 'Óxido de cobre', disabled: false },
    ]);
  });
});

describe('usedInputPhrase', () => {
  it('names the quantity, the input and its packages', () => {
    expect(usedInputPhrase('100', urea)).toBe('100 kg de Urea 46 % (2 bultos)');
    expect(usedInputPhrase('25', bocashi)).toBe('25 kg de Bocashi');
  });
});
