import { describe, expect, expectTypeOf, it } from 'vitest';

import type { components } from '@/lib/api/schema';
import { buildAgriculturalActivity } from '@/test/factories';

import {
  completionSummary,
  createCompletionSchema,
  toCompletionRequest,
} from './completion-rules';

type Schemas = components['schemas'];

const TODAY = '2026-10-22';
// Programada el 8 de octubre (hora de Bogotá) para el 20.
const activity = buildAgriculturalActivity({
  scheduled_date: '2026-10-20',
  created_at: '2026-10-08T09:00:00-05:00',
});

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

const parse = (
  input: {
    done_date?: string;
    inputs?: { input_id: string; quantity: string }[];
  },
  source = activity,
) =>
  createCompletionSchema({ today: TODAY, activity: source }).safeParse({
    done_date: TODAY,
    inputs: [],
    ...input,
  });

const errorsOf = (result: ReturnType<typeof parse>) =>
  result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join('.'),
          issue.message,
        ]),
      );

describe('the completion form', () => {
  it('accepts a labor without inputs', () => {
    expect(parse({}).success).toBe(true);
  });

  it('accepts several inputs with their quantity', () => {
    const result = parse({
      inputs: [
        { input_id: 'in1', quantity: '100' },
        { input_id: 'in2', quantity: '2,5' },
      ],
    });

    // La coma decimal del teclado en español llega al servidor como punto.
    expect(result.success && result.data.inputs).toEqual([
      { input_id: 'in1', quantity: '100' },
      { input_id: 'in2', quantity: '2.5' },
    ]);
  });

  it('wants the date', () => {
    expect(errorsOf(parse({ done_date: '' }))).toEqual({
      done_date: 'Campo obligatorio',
    });
  });

  it('rejects a future date', () => {
    expect(errorsOf(parse({ done_date: '2026-10-23' }))).toEqual({
      done_date: 'La fecha no puede ser futura',
    });
  });

  it('rejects a date before the day the activity was scheduled', () => {
    expect(errorsOf(parse({ done_date: '2026-10-07' }))).toEqual({
      done_date:
        'La fecha no puede ser anterior a la programación de la actividad (8 de octubre de 2026)',
    });
    // El mismo día en que se programó sí vale, y también antes de la fecha programada.
    expect(parse({ done_date: '2026-10-08' }).success).toBe(true);
    expect(parse({ done_date: '2026-10-19' }).success).toBe(true);
  });

  it('reads the day it was scheduled in Bogotá, not in UTC', () => {
    // Las 21:00 del 8 en Bogotá ya son el 9 en UTC.
    const lateEvening = buildAgriculturalActivity({
      created_at: '2026-10-09T02:00:00Z',
    });

    expect(parse({ done_date: '2026-10-08' }, lateEvening).success).toBe(true);
  });

  it('wants an input in each row', () => {
    expect(
      errorsOf(parse({ inputs: [{ input_id: '', quantity: '2' }] })),
    ).toEqual({ 'inputs.0.input_id': 'Elige un insumo del catálogo' });
  });

  it('wants the quantity of each input', () => {
    expect(
      errorsOf(parse({ inputs: [{ input_id: 'in1', quantity: ' ' }] })),
    ).toEqual({ 'inputs.0.quantity': 'Indique la cantidad del insumo' });
  });

  it('wants a quantity above zero with up to three decimals', () => {
    const quantityError = (quantity: string) =>
      errorsOf(parse({ inputs: [{ input_id: 'in1', quantity }] }))[
        'inputs.0.quantity'
      ];

    expect(quantityError('0')).toBe('La cantidad debe ser mayor que cero');
    expect(quantityError('-3')).toBe('La cantidad debe ser mayor que cero');
    expect(quantityError('abc')).toBe('Escribe una cantidad válida');
    expect(quantityError('1.2345')).toBe('Usa máximo 3 decimales');
    expect(quantityError('99999999')).toBe('La cantidad es demasiado grande');
    expect(quantityError('0,125')).toBeUndefined();
  });

  it('rejects an input that is already in the list', () => {
    expect(
      errorsOf(
        parse({
          inputs: [
            { input_id: 'in1', quantity: '2' },
            { input_id: 'in2', quantity: '1' },
            { input_id: 'in1', quantity: '3' },
          ],
        }),
      ),
    ).toEqual({ 'inputs.2.input_id': 'Este insumo ya está en la lista' });
  });

  it('accepts no inputs in an inventory, which only reminds the count', () => {
    const inventory = buildAgriculturalActivity({ activity_type: 'inventory' });

    expect(
      errorsOf(
        parse({ inputs: [{ input_id: 'in1', quantity: '2' }] }, inventory),
      ),
    ).toEqual({ inputs: 'Una actividad de inventario no lleva insumos' });
    expect(parse({}, inventory).success).toBe(true);
  });
});

describe('toCompletionRequest', () => {
  it('is the body of the completion, with the time of the device', () => {
    const result = parse({
      done_date: '2026-10-19',
      inputs: [{ input_id: 'in1', quantity: '2' }],
    });
    if (!result.success)
      throw new Error('El formulario de prueba no es válido');

    const body = toCompletionRequest(result.data, '2026-10-19T16:42:00.000Z');

    expectTypeOf(body).toExtend<Schemas['CompletionRequest']>();
    expect(body).toEqual({
      done_date: '2026-10-19',
      inputs: [{ input_id: 'in1', quantity: '2' }],
      captured_at: '2026-10-19T16:42:00.000Z',
    });
  });
});

describe('completionSummary', () => {
  const fertilization = buildAgriculturalActivity({
    activity_type: 'fertilization',
  });

  it('names the labor, the plot, the date and what is discounted', () => {
    expect(
      completionSummary(fertilization, '2026-10-19', [
        { input: urea, quantity: '100' },
      ]),
    ).toBe(
      'Vas a registrar la labor Fertilización de P-03 como realizada el 19 de octubre de 2026, con 100 kg de Urea 46 % (2 bultos), que se descuentan del inventario de la finca. Después no se podrá modificar.',
    );
  });

  it('joins several inputs', () => {
    expect(
      completionSummary(fertilization, '2026-10-19', [
        { input: urea, quantity: '100' },
        { input: bocashi, quantity: '25' },
        { input: { ...bocashi, name: 'Cal' }, quantity: '10' },
      ]),
    ).toContain(
      'con 100 kg de Urea 46 % (2 bultos), 25 kg de Bocashi y 10 kg de Cal, que se descuentan',
    );
  });

  it('says that a labor used no inputs', () => {
    expect(completionSummary(fertilization, '2026-10-19', [])).toBe(
      'Vas a registrar la labor Fertilización de P-03 como realizada el 19 de octubre de 2026, sin insumos. Después no se podrá modificar.',
    );
  });

  it('names a labor of type other by its description', () => {
    expect(
      completionSummary(
        buildAgriculturalActivity({
          activity_type: 'other',
          other_description: 'Resiembra',
        }),
        '2026-10-19',
        [],
      ),
    ).toContain('la labor Resiembra de P-03');
  });
});
