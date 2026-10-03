import { describe, expect, it } from 'vitest';

import { normalizeVarietyName } from './characterization-rules';
import {
  type CharacterizationFormInput,
  createCharacterizationFormSchema,
  createVarietyFormSchema,
  DUPLICATE_VARIETY_MESSAGE,
  MISSING_VARIETY_MESSAGE,
  REPEATED_VARIETY_MESSAGE,
} from './schemas';

const schema = createCharacterizationFormSchema(new Date(2026, 9, 3));

const form = (
  overrides: Partial<CharacterizationFormInput> = {},
): CharacterizationFormInput => ({
  varieties: [
    { variety_id: 'ccn-51', tree_count: '1800' },
    { variety_id: 'ics-95', tree_count: '600' },
  ],
  planting_date: '2021-03',
  stage: 'full_production',
  management_system: 'conventional',
  shade_type: '',
  ...overrides,
});

const issues = (overrides: Partial<CharacterizationFormInput>) =>
  schema
    .safeParse(form(overrides))
    .error?.issues.map(({ path, message }) => ({ path, message }));

describe('characterization form schema', () => {
  it('turns the form into what the API expects', () => {
    expect(schema.parse(form())).toEqual({
      varieties: [
        { variety_id: 'ccn-51', tree_count: 1800 },
        { variety_id: 'ics-95', tree_count: 600 },
      ],
      planting_date: '2021-03',
      stage: 'full_production',
      management_system: 'conventional',
      shade_type: null,
    });
  });

  it('stops when no variety was chosen', () => {
    expect(issues({ varieties: [] })).toEqual([
      { path: ['varieties'], message: MISSING_VARIETY_MESSAGE },
    ]);
    expect(
      issues({ varieties: [{ variety_id: '', tree_count: '10' }] }),
    ).toEqual([
      {
        path: ['varieties', 0, 'variety_id'],
        message: MISSING_VARIETY_MESSAGE,
      },
    ]);
  });

  it('marks the second line of a repeated variety', () => {
    expect(
      issues({
        varieties: [
          { variety_id: 'ccn-51', tree_count: '10' },
          { variety_id: 'ics-95', tree_count: '10' },
          { variety_id: 'ccn-51', tree_count: '20' },
        ],
      }),
    ).toEqual([
      {
        path: ['varieties', 2, 'variety_id'],
        message: REPEATED_VARIETY_MESSAGE,
      },
    ]);
  });

  it('accepts up to 10 varieties', () => {
    const lines = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        variety_id: `variety-${index}`,
        tree_count: '10',
      }));

    expect(issues({ varieties: lines(10) })).toBeUndefined();
    expect(issues({ varieties: lines(11) })).toEqual([
      { path: ['varieties'], message: 'Puedes registrar hasta 10 variedades.' },
    ]);
  });

  it('asks for whole trees between 1 and 1,000,000', () => {
    const treeIssue = (tree_count: string) =>
      issues({ varieties: [{ variety_id: 'ccn-51', tree_count }] })?.[0]
        ?.message;

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

  it('requires a planting month that is not in the future', () => {
    expect(issues({ planting_date: '2026-10' })).toBeUndefined();
    expect(issues({ planting_date: '2026-11' })).toEqual([
      {
        path: ['planting_date'],
        message: 'La fecha de siembra no puede ser futura.',
      },
    ]);
    expect(issues({ planting_date: '' })).toEqual([
      {
        path: ['planting_date'],
        message: 'Ingresa el mes y el año de siembra.',
      },
    ]);
    expect(issues({ planting_date: '2021-13' })).toEqual([
      {
        path: ['planting_date'],
        message: 'Ingresa el mes y el año de siembra.',
      },
    ]);
  });

  it('does not accept plantings before 1950', () => {
    expect(issues({ planting_date: '1950-01' })).toBeUndefined();
    expect(issues({ planting_date: '1949-12' })).toEqual([
      {
        path: ['planting_date'],
        message: 'La fecha de siembra no puede ser anterior a 1950.',
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

  it('accepts a name and an optional description, trimmed', () => {
    expect(
      varietySchema.parse({ name: '  ICS-95 ', description: ' Trinidad ' }),
    ).toEqual({ name: 'ICS-95', description: 'Trinidad' });
    expect(varietySchema.parse({ name: 'ICS-95', description: '' })).toEqual({
      name: 'ICS-95',
      description: '',
    });
  });

  it('requires the name and limits both fields', () => {
    const message = (values: { name: string; description: string }) =>
      varietySchema.safeParse(values).error?.issues[0].message;

    expect(message({ name: '  ', description: '' })).toBe(
      'Ingresa el nombre de la variedad.',
    );
    expect(message({ name: 'x'.repeat(61), description: '' })).toBe(
      'Usa máximo 60 caracteres.',
    );
    expect(
      message({ name: 'x'.repeat(60), description: 'y'.repeat(201) }),
    ).toBe('Usa máximo 200 caracteres.');
  });

  it('rejects a name the catalog already has, however it is written', () => {
    for (const name of ['CCN 51', 'ccn51', 'Ccn-51']) {
      expect(
        varietySchema.safeParse({ name, description: '' }).error?.issues[0]
          .message,
      ).toBe(DUPLICATE_VARIETY_MESSAGE);
    }
  });
});
