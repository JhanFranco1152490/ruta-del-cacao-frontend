import { describe, expect, it } from 'vitest';

import { normalizeVarietyName } from './characterization-rules';
import {
  type CharacterizationFormInput,
  createCharacterizationFormSchema,
  createVarietyFormSchema,
  DUPLICATE_VARIETY_MESSAGE,
  MISSING_VARIETY_MESSAGE,
  REPEATED_PLANTING_MESSAGE,
} from './schemas';

const schema = createCharacterizationFormSchema(new Date(2026, 9, 3), {
  areaHectares: '2.40',
});

type Line = CharacterizationFormInput['plantings'][number];

const line = (overrides: Partial<Line> = {}): Line => ({
  variety_id: 'ccn-51',
  planting_date: '2021-03',
  tree_count: '1800',
  ...overrides,
});

const form = (
  overrides: Partial<CharacterizationFormInput> = {},
): CharacterizationFormInput => ({
  plantings: [
    line(),
    line({ variety_id: 'ics-95', planting_date: '2023-08', tree_count: '600' }),
  ],
  stage: 'full_production',
  management_system: 'conventional',
  shade_type: '',
  ...overrides,
});

const issues = (overrides: Partial<CharacterizationFormInput>) =>
  schema
    .safeParse(form(overrides))
    .error?.issues.map(({ path, message }) => ({ path, message }));

const lineIssues = (overrides: Partial<Line>) =>
  issues({ plantings: [line(overrides)] });

describe('characterization form schema', () => {
  it('turns the form into what the API expects', () => {
    expect(schema.parse(form())).toEqual({
      plantings: [
        { variety_id: 'ccn-51', planting_date: '2021-03', tree_count: 1800 },
        { variety_id: 'ics-95', planting_date: '2023-08', tree_count: 600 },
      ],
      stage: 'full_production',
      management_system: 'conventional',
      shade_type: null,
    });
  });

  it('stops when no variety was chosen', () => {
    expect(issues({ plantings: [] })).toEqual([
      { path: ['plantings'], message: MISSING_VARIETY_MESSAGE },
    ]);
    expect(lineIssues({ variety_id: '' })).toEqual([
      {
        path: ['plantings', 0, 'variety_id'],
        message: MISSING_VARIETY_MESSAGE,
      },
    ]);
  });

  it('accepts the same variety planted on another month', () => {
    expect(
      issues({
        plantings: [
          line({ planting_date: '2018-04', tree_count: '1000' }),
          line({ planting_date: '2024-02', tree_count: '500' }),
        ],
      }),
    ).toBeUndefined();
  });

  it('marks the second line of a repeated planting', () => {
    expect(
      issues({
        plantings: [
          line({ tree_count: '10' }),
          line({ variety_id: 'ics-95', tree_count: '10' }),
          line({ tree_count: '20' }),
        ],
      }),
    ).toEqual([
      {
        path: ['plantings', 2, 'variety_id'],
        message: REPEATED_PLANTING_MESSAGE,
      },
    ]);
  });

  it('accepts up to 10 plantings', () => {
    const lines = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        line({ variety_id: `variety-${index}`, tree_count: '10' }),
      );

    expect(issues({ plantings: lines(10) })).toBeUndefined();
    expect(issues({ plantings: lines(11) })).toEqual([
      { path: ['plantings'], message: 'Puedes registrar hasta 10 siembras.' },
    ]);
  });

  it('asks for whole trees between 1 and 1,000,000', () => {
    const big = createCharacterizationFormSchema(new Date(2026, 9, 3), {
      areaHectares: '200.00',
    });
    const treeIssue = (tree_count: string) =>
      big.safeParse(form({ plantings: [line({ tree_count })] })).error
        ?.issues[0]?.message;

    expect(treeIssue('1')).toBeUndefined();
    expect(treeIssue(' 1000000 ')).toBeUndefined();
    expect(treeIssue('0')).toBe('Debe haber al menos 1 árbol.');
    expect(treeIssue('1000001')).toBe('Usa máximo 1.000.000 árboles.');
    expect(treeIssue('12.5')).toBe(
      'Ingresa el número de árboles con números enteros.',
    );
    expect(treeIssue('')).toBe(
      'Ingresa el número de árboles con números enteros.',
    );
  });

  it('requires a planting month on each line, not in the future', () => {
    const path = ['plantings', 0, 'planting_date'];
    expect(lineIssues({ planting_date: '2026-10' })).toBeUndefined();
    expect(lineIssues({ planting_date: '2026-11' })).toEqual([
      { path, message: 'La fecha de siembra no puede ser futura.' },
    ]);
    expect(lineIssues({ planting_date: '' })).toEqual([
      { path, message: 'Ingresa el mes y el año de siembra.' },
    ]);
    expect(lineIssues({ planting_date: '2021-13' })).toEqual([
      { path, message: 'Ingresa el mes y el año de siembra.' },
    ]);
  });

  it('does not accept plantings before 1950', () => {
    expect(lineIssues({ planting_date: '1950-01' })).toBeUndefined();
    expect(lineIssues({ planting_date: '1949-12' })).toEqual([
      {
        path: ['plantings', 0, 'planting_date'],
        message: 'La fecha de siembra no puede ser anterior a 1950.',
      },
    ]);
  });

  it('stops an impossible density over the area of the plot', () => {
    expect(lineIssues({ tree_count: '24000' })).toBeUndefined();
    expect(lineIssues({ tree_count: '24001' })).toEqual([
      {
        path: ['plantings'],
        message:
          'Con 10.000 árboles/ha la densidad no es posible: el máximo es 10.000. Revisa el número de árboles o el área de la parcela.',
      },
    ]);
  });

  it('requires the stage of the productive cycle', () => {
    expect(issues({ stage: '' })).toEqual([
      { path: ['stage'], message: 'Selecciona la etapa del ciclo productivo.' },
    ]);
  });

  it('leaves management and shade optional, but only with known values', () => {
    expect(
      schema.parse(form({ management_system: '', shade_type: '' })),
    ).toMatchObject({ management_system: null, shade_type: null });
    expect(schema.parse(form({ shade_type: 'permanent' })).shade_type).toBe(
      'permanent',
    );
    expect(
      schema.safeParse(form({ management_system: 'biodynamic' as never }))
        .success,
    ).toBe(false);
  });
});

describe('variety form schema', () => {
  const varietySchema = createVarietyFormSchema(
    new Set([normalizeVarietyName('CCN-51')]),
  );

  const values = (overrides = {}) => ({
    name: 'ICS-95',
    common_names: '',
    description: '',
    ...overrides,
  });
  const message = (overrides = {}) =>
    varietySchema.safeParse(values(overrides)).error?.issues[0].message;

  it('accepts a name and optional common names and description, trimmed', () => {
    expect(
      varietySchema.parse(
        values({ name: '  ICS-95 ', description: ' Trinidad ' }),
      ),
    ).toEqual({ name: 'ICS-95', common_names: [], description: 'Trinidad' });
  });

  it('reads the common names separated by commas, without repeating them', () => {
    expect(
      varietySchema.parse(
        values({ common_names: ' Saravena, Fedecacao Saravena ,, saravena ' }),
      ).common_names,
    ).toEqual(['Saravena', 'Fedecacao Saravena']);
  });

  it('allows up to 5 common names of 60 characters', () => {
    expect(message({ common_names: 'a, b, c, d, e' })).toBeUndefined();
    expect(message({ common_names: 'a, b, c, d, e, f' })).toBe(
      'Escribe hasta 5 nombres comunes.',
    );
    expect(message({ common_names: 'x'.repeat(61) })).toBe(
      'Cada nombre común lleva máximo 60 caracteres.',
    );
  });

  it('requires the name and limits name and description', () => {
    expect(message({ name: '  ' })).toBe('Ingresa el nombre de la variedad.');
    expect(message({ name: 'x'.repeat(61) })).toBe('Usa máximo 60 caracteres.');
    expect(message({ description: 'y'.repeat(201) })).toBe(
      'Usa máximo 200 caracteres.',
    );
  });

  it('rejects a name the catalog already has, however it is written', () => {
    for (const name of ['CCN 51', 'ccn51', 'Ccn-51']) {
      expect(message({ name })).toBe(DUPLICATE_VARIETY_MESSAGE);
    }
  });
});
