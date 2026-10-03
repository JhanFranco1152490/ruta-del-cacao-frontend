import { describe, expect, it } from 'vitest';

import {
  createPlotFormSchema,
  DUPLICATE_CODE_MESSAGE,
  normalizeCode,
} from './schemas';

const schema = createPlotFormSchema(new Set([normalizeCode('P1 · El Mango')]));

describe('plot form schema', () => {
  it('accepts a code and an area and cleans both', () => {
    expect(schema.parse({ code: '  P2  ', area_hectares: '2,4' })).toEqual({
      code: 'P2',
      area_hectares: '2.4',
    });
  });

  it('requires the code', () => {
    const result = schema.safeParse({ code: '   ', area_hectares: '1' });

    expect(result.error?.issues[0].message).toBe(
      'Ingresa el código de la parcela.',
    );
  });

  it('limits the code to 50 characters', () => {
    expect(
      schema.safeParse({ code: 'x'.repeat(51), area_hectares: '1' }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ code: 'x'.repeat(50), area_hectares: '1' }).success,
    ).toBe(true);
  });

  it('rejects a code another plot of the farm already has, ignoring case and spaces', () => {
    const result = schema.safeParse({
      code: ' p1 · el mango ',
      area_hectares: '1',
    });

    expect(result.error?.issues[0].message).toBe(DUPLICATE_CODE_MESSAGE);
  });

  it('requires an area above zero', () => {
    const result = schema.safeParse({ code: 'P2', area_hectares: '0' });

    expect(result.error?.issues[0].message).toBe('El área debe ser mayor a 0');
  });
});
