import { describe, expect, it } from 'vitest';

import { normalizeCatalogName } from '@/lib/format/search';

import {
  createPestDiseaseFormSchema,
  DUPLICATE_PEST_DISEASE_MESSAGE,
  type PestDiseaseFormInput,
  toPestDiseaseRequest,
} from './pest-schema';

const schema = createPestDiseaseFormSchema(
  new Set([normalizeCatalogName('Mazorca negra')]),
);

const values = (
  overrides: Partial<PestDiseaseFormInput> = {},
): PestDiseaseFormInput => ({
  name: 'Monilia',
  kind: 'disease',
  scientific_name: '',
  description: 'Solo ataca la mazorca.',
  ...overrides,
});

const messageOf = (overrides: Partial<PestDiseaseFormInput>) =>
  schema.safeParse(values(overrides)).error?.issues[0].message;

describe('the pest or disease form', () => {
  it('accepts a name, a kind and a description, trimmed', () => {
    expect(
      schema.parse(
        values({
          name: '  Monilia ',
          scientific_name: ' Moniliophthora roreri ',
          description: ' Solo ataca la mazorca. ',
        }),
      ),
    ).toEqual({
      name: 'Monilia',
      kind: 'disease',
      scientific_name: 'Moniliophthora roreri',
      description: 'Solo ataca la mazorca.',
    });
  });

  it('wants a name of 2 to 60 characters', () => {
    expect(messageOf({ name: ' ' })).toBe(
      'Ingresa el nombre de la plaga o enfermedad.',
    );
    expect(messageOf({ name: 'M' })).toBe('Usa al menos 2 caracteres.');
    expect(messageOf({ name: 'M'.repeat(61) })).toBe(
      'Usa máximo 60 caracteres.',
    );
  });

  it('rejects a name already in the catalog, written in any way', () => {
    expect(messageOf({ name: 'mazorca-NEGRA' })).toBe(
      DUPLICATE_PEST_DISEASE_MESSAGE,
    );
  });

  it('wants the kind', () => {
    expect(messageOf({ kind: '' })).toBe('Elige si es plaga o enfermedad.');
  });

  it('wants a description of up to 300 characters', () => {
    expect(messageOf({ description: '  ' })).toBe(
      'Describe cómo se reconoce en campo.',
    );
    expect(messageOf({ description: 'a'.repeat(301) })).toBe(
      'Usa máximo 300 caracteres.',
    );
  });

  it('takes the scientific name as optional, of up to 100 characters', () => {
    expect(messageOf({ scientific_name: 'a'.repeat(101) })).toBe(
      'Usa máximo 100 caracteres.',
    );
  });
});

describe('toPestDiseaseRequest', () => {
  it('sends an empty scientific name as null', () => {
    expect(toPestDiseaseRequest(schema.parse(values()))).toEqual({
      name: 'Monilia',
      kind: 'disease',
      scientific_name: null,
      description: 'Solo ataca la mazorca.',
    });
  });
});
