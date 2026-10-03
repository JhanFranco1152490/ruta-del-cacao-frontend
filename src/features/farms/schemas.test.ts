import { describe, expect, it } from 'vitest';

import {
  emptyFarmForm,
  farmFormSchema,
  OUTSIDE_OPERATING_AREA,
} from './schemas';

const valid = {
  ...emptyFarmForm,
  name: 'La Esperanza',
  municipality_id: '54001',
  area_hectares: '12.50',
  altitude_masl: '950',
  latitude: '7.8234567',
  longitude: '-72.5123456',
} as const;

const messages = (values: object) =>
  farmFormSchema
    .safeParse(values)
    .error?.issues.map((issue) => issue.message) ?? [];

describe('farmFormSchema', () => {
  it('accepts a valid farm with optional details', () => {
    expect(farmFormSchema.safeParse(valid).success).toBe(true);
  });

  it('reports the required farm and municipality fields', () => {
    expect(messages(emptyFarmForm)).toEqual(
      expect.arrayContaining([
        'Ingresa el nombre de la finca.',
        'Selecciona un municipio.',
      ]),
    );
  });

  it('requires a georeferenced point', () => {
    expect(messages({ ...valid, latitude: '', longitude: '' })).toEqual(
      expect.arrayContaining(['La georreferenciación es obligatoria']),
    );
  });

  it('rejects impossible coordinates', () => {
    expect(messages({ ...valid, latitude: '90.1' })).toContain(
      'Coordenadas no válidas',
    );
    expect(messages({ ...valid, longitude: '-180.1' })).toContain(
      'Coordenadas no válidas',
    );
  });

  it('accepts a decimal comma and sends a decimal point', () => {
    const result = farmFormSchema.safeParse({
      ...valid,
      area_hectares: '12,5',
      latitude: '7,8234567',
      longitude: '-72,5123456',
    });

    expect(result.data).toMatchObject({
      area_hectares: '12.5',
      latitude: '7.8234567',
      longitude: '-72.5123456',
    });
  });

  it('limits decimals to the precision the API stores', () => {
    expect(messages({ ...valid, latitude: '7.82345678' })).toEqual([
      'Usa máximo 7 decimales.',
    ]);
    expect(messages({ ...valid, area_hectares: '12.505' })).toEqual([
      'Usa máximo 2 decimales.',
    ]);
  });

  it('reports only the missing point for an empty coordinate', () => {
    expect(messages({ ...valid, latitude: '' })).toEqual([
      'La georreferenciación es obligatoria',
    ]);
  });

  it('requires a positive decimal area', () => {
    expect(messages({ ...valid, area_hectares: '0' })).toContain(
      'El área debe ser mayor a 0',
    );
    expect(messages({ ...valid, area_hectares: 'doce' })).toContain(
      'El área debe ser mayor a 0',
    );
  });

  it('limits altitude to the approved domain range', () => {
    expect(messages({ ...valid, altitude_masl: '-501' })).toContain(
      'La altitud debe estar entre -500 y 9000.',
    );
    expect(messages({ ...valid, altitude_masl: '9001' })).toContain(
      'La altitud debe estar entre -500 y 9000.',
    );
    expect(
      farmFormSchema.safeParse({ ...valid, altitude_masl: '-500' }).success,
    ).toBe(true);
  });

  describe('Norte de Santander bounds', () => {
    const issues = (values: object) =>
      farmFormSchema
        .safeParse({ ...valid, ...values })
        .error?.issues.map((issue) => [issue.path[0], issue.message]) ?? [];

    it.each([
      ['south', { latitude: '6.871' }, 'latitude'],
      ['north', { latitude: '9.292' }, 'latitude'],
      ['west', { longitude: '-73.635' }, 'longitude'],
      ['east', { longitude: '-72.046' }, 'longitude'],
    ])('rejects a point past the %s edge on that field', (_, values, field) => {
      expect(issues(values)).toEqual([[field, OUTSIDE_OPERATING_AREA]]);
    });

    it('accepts a point right on the edges', () => {
      expect(
        farmFormSchema.safeParse({
          ...valid,
          latitude: '6.872',
          longitude: '-73.634',
        }).success,
      ).toBe(true);
      expect(
        farmFormSchema.safeParse({
          ...valid,
          latitude: '9.291',
          longitude: '-72.047',
        }).success,
      ).toBe(true);
    });

    it('keeps "Coordenadas no válidas" alone for an impossible point', () => {
      expect(issues({ latitude: '95' })).toEqual([
        ['latitude', 'Coordenadas no válidas'],
      ]);
    });
  });
});
