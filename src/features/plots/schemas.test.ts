import { describe, expect, it } from 'vitest';

import {
  createPlotFormSchema,
  DUPLICATE_NAME_MESSAGE,
  normalizeName,
} from './schemas';

const schema = createPlotFormSchema(new Set([normalizeName('El Mango')]));

describe('plot form schema', () => {
  it('accepts a name and an area and cleans both', () => {
    expect(
      schema.parse({ name: '  Lote del río  ', area_hectares: '2,4' }),
    ).toEqual({ name: 'Lote del río', area_hectares: '2.4' });
  });

  it('lets the plot go without a name: the server gives it its code', () => {
    expect(schema.parse({ name: '   ', area_hectares: '1' })).toEqual({
      name: '',
      area_hectares: '1',
    });
  });

  it('limits the name to 60 characters', () => {
    expect(
      schema.safeParse({ name: 'x'.repeat(61), area_hectares: '1' }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ name: 'x'.repeat(60), area_hectares: '1' }).success,
    ).toBe(true);
  });

  it('rejects a name another plot of the farm already has, ignoring case and spaces', () => {
    const result = schema.safeParse({ name: ' el mango ', area_hectares: '1' });

    expect(result.error?.issues[0].message).toBe(DUPLICATE_NAME_MESSAGE);
  });

  it('requires an area above zero', () => {
    const result = schema.safeParse({ name: 'La loma', area_hectares: '0' });

    expect(result.error?.issues[0].message).toBe('El área debe ser mayor a 0');
  });
});
