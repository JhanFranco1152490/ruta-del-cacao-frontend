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
  package_type: '',
  package_size: '',
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
      package_type: null,
      package_size: null,
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

describe('package', () => {
  const tub = { unit: 'ml' as const, package_type: 'tub' as const };

  it('sends the package type and its content with a point', () => {
    expect(schema.parse(values({ ...tub, package_size: '100' }))).toMatchObject(
      { package_type: 'tub', package_size: '100' },
    );
    expect(
      schema.parse(
        values({ unit: 'l', package_type: 'gallon', package_size: '3,785' }),
      ).package_size,
    ).toBe('3.785');
  });

  it('is optional, and travels empty without it', () => {
    expect(schema.parse(values())).toMatchObject({
      package_type: null,
      package_size: null,
    });
  });

  it('needs both the type and the content', () => {
    expect(errorsOf(values({ package_type: 'tub' }))).toEqual({
      package_size: REQUIRED_FIELD_MESSAGE,
    });
    expect(errorsOf(values({ package_size: '100' }))).toEqual({
      package_type: REQUIRED_FIELD_MESSAGE,
    });
  });

  it('holds from 0,001 to 100.000', () => {
    const range = 'El contenido va de 0,001 a 100.000.';
    expect(errorsOf(values({ ...tub, package_size: '0' })).package_size).toBe(
      range,
    );
    expect(
      errorsOf(values({ ...tub, package_size: '100000.5' })).package_size,
    ).toBe(range);
    expect(
      errorsOf(values({ ...tub, package_size: 'cien' })).package_size,
    ).toBe(range);
    expect(errorsOf(values({ ...tub, package_size: '0.001' }))).toEqual({});
    expect(errorsOf(values({ ...tub, package_size: '100000' }))).toEqual({});
  });

  it('takes at most three decimals', () => {
    expect(
      errorsOf(values({ ...tub, package_size: '1.2345' })).package_size,
    ).toBe('Usa máximo 3 decimales.');
  });

  it('rejects a package outside the options', () => {
    expect(
      Object.keys(
        errorsOf(
          values({
            package_type: 'crate' as InputFormInput['package_type'],
            package_size: '10',
          }),
        ),
      ),
    ).toEqual(['package_type']);
  });

  it('is marked together with the other missing fields', () => {
    expect(
      errorsOf(values({ name: '', input_type: '', package_type: 'tub' })),
    ).toEqual({
      name: REQUIRED_FIELD_MESSAGE,
      input_type: REQUIRED_FIELD_MESSAGE,
      package_size: REQUIRED_FIELD_MESSAGE,
    });
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
