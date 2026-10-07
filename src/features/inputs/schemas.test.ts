import { describe, expect, it } from 'vitest';

import {
  createInputFormSchema,
  DUPLICATE_INPUT_MESSAGE,
  findDuplicateInput,
  inputDuplicateKey,
  REQUIRED_FIELD_MESSAGE,
  type InputFormInput,
} from './schemas';

const values = (overrides: Partial<InputFormInput> = {}): InputFormInput => ({
  name: 'Urea 46 %',
  input_type: 'fertilizer',
  unit: 'kg',
  bag_weight_kg: '',
  ...overrides,
});

const schema = createInputFormSchema(new Set());

const errorsOf = (input: InputFormInput, target = schema) => {
  const result = target.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
};

describe('input form schema', () => {
  it('accepts a complete input and trims the name', () => {
    expect(schema.parse(values({ name: '  Urea 46 %  ' }))).toEqual({
      name: 'Urea 46 %',
      input_type: 'fertilizer',
      unit: 'kg',
      bag_weight_kg: null,
    });
  });

  it('marks every empty required field', () => {
    expect(errorsOf(values({ name: '   ', input_type: '', unit: '' }))).toEqual(
      {
        name: REQUIRED_FIELD_MESSAGE,
        input_type: REQUIRED_FIELD_MESSAGE,
        unit: REQUIRED_FIELD_MESSAGE,
      },
    );
  });

  it('keeps the name between 2 and 80 characters', () => {
    expect(errorsOf(values({ name: 'U' })).name).toBe(
      'Escribe al menos 2 caracteres.',
    );
    expect(errorsOf(values({ name: 'U'.repeat(81) })).name).toBe(
      'Usa máximo 80 caracteres.',
    );
    expect(errorsOf(values({ name: 'U'.repeat(80) }))).toEqual({});
  });

  it('rejects a type or a unit outside the options', () => {
    const invalid = values({
      input_type: 'herbicide' as InputFormInput['input_type'],
      unit: 'gallon' as InputFormInput['unit'],
    });
    expect(Object.keys(errorsOf(invalid))).toEqual(['input_type', 'unit']);
  });
});

describe('bag weight', () => {
  it('is required with the bag unit', () => {
    expect(errorsOf(values({ unit: 'bag' })).bag_weight_kg).toBe(
      REQUIRED_FIELD_MESSAGE,
    );
  });

  it('accepts a comma and sends a decimal with a point', () => {
    expect(
      schema.parse(values({ unit: 'bag', bag_weight_kg: '46,5' }))
        .bag_weight_kg,
    ).toBe('46.5');
  });

  it('goes from 1 to 100 kg', () => {
    const range = 'El peso del bulto va de 1 a 100 kg.';
    expect(
      errorsOf(values({ unit: 'bag', bag_weight_kg: '0.5' })).bag_weight_kg,
    ).toBe(range);
    expect(
      errorsOf(values({ unit: 'bag', bag_weight_kg: '100.5' })).bag_weight_kg,
    ).toBe(range);
    expect(
      errorsOf(values({ unit: 'bag', bag_weight_kg: 'cincuenta' }))
        .bag_weight_kg,
    ).toBe(range);
    expect(errorsOf(values({ unit: 'bag', bag_weight_kg: '1' }))).toEqual({});
    expect(errorsOf(values({ unit: 'bag', bag_weight_kg: '100' }))).toEqual({});
  });

  it('takes at most two decimals', () => {
    expect(
      errorsOf(values({ unit: 'bag', bag_weight_kg: '46.555' })).bag_weight_kg,
    ).toBe('Usa máximo 2 decimales.');
  });

  it('is marked together with the other missing fields', () => {
    expect(errorsOf(values({ name: '', input_type: '', unit: 'bag' }))).toEqual(
      {
        name: REQUIRED_FIELD_MESSAGE,
        input_type: REQUIRED_FIELD_MESSAGE,
        bag_weight_kg: REQUIRED_FIELD_MESSAGE,
      },
    );
  });

  it('is ignored with another unit', () => {
    expect(
      schema.parse(values({ unit: 'kg', bag_weight_kg: 'abc' })).bag_weight_kg,
    ).toBeNull();
  });
});

describe('duplicate inputs', () => {
  const catalog = [
    { id: 'a', name: 'Urea 46%', input_type: 'fertilizer' },
    { id: 'b', name: 'Oxicloruro de cobre', input_type: 'fungicide' },
  ];

  it('rejects the name of another input of the same type, compared like the server', () => {
    const taken = createInputFormSchema(
      new Set(
        catalog.map((input) => inputDuplicateKey(input.name, input.input_type)),
      ),
    );
    expect(errorsOf(values({ name: 'urea-46 %' }), taken).name).toBe(
      DUPLICATE_INPUT_MESSAGE,
    );
    expect(
      errorsOf(values({ name: 'Urea 46 %', input_type: 'other' }), taken),
    ).toEqual({});
  });

  it('finds the input that already has the name and type', () => {
    expect(
      findDuplicateInput(catalog, {
        name: ' UREA 46 % ',
        input_type: 'fertilizer',
      })?.id,
    ).toBe('a');
    expect(
      findDuplicateInput(catalog, { name: 'Urea 46 %', input_type: 'other' }),
    ).toBeUndefined();
  });

  it('does not count the input being edited', () => {
    expect(
      findDuplicateInput(
        catalog,
        { name: 'Urea 46 %', input_type: 'fertilizer' },
        'a',
      ),
    ).toBeUndefined();
  });
});
