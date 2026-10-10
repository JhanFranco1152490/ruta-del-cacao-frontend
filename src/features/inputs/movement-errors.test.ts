import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { movementErrorOf } from './movement-errors';

const apiError = (
  status: number,
  code: string,
  fields: Record<string, string[]> = {},
) => new ApiError(status, { detail: 'Error de prueba.', code, fields });

describe('movementErrorOf', () => {
  it('places the server field errors on the form fields', () => {
    expect(
      movementErrorOf(
        apiError(400, 'validation_error', {
          occurred_on: ['Hay movimientos posteriores a esa fecha.'],
          counted_quantity: ['Usa máximo 3 decimales.'],
          farm_id: ['La finca no es del productor del insumo.'],
        }),
      ),
    ).toEqual({
      fields: {
        occurred_on: 'Hay movimientos posteriores a esa fecha.',
        amount: 'Usa máximo 3 decimales.',
        farm: 'La finca no es del productor del insumo.',
      },
      general: undefined,
    });
  });

  it('keeps a field the form does not have in the general notice', () => {
    expect(
      movementErrorOf(apiError(400, 'validation_error', { kind: ['No.'] })),
    ).toEqual({ fields: {}, general: 'No.' });
  });

  it('explains an inactive input and an inactive farm', () => {
    expect(movementErrorOf(apiError(422, 'input_inactive')).general).toMatch(
      /inactivo/,
    );
    expect(movementErrorOf(apiError(422, 'farm_inactive')).fields.farm).toBe(
      'La finca está inactiva: no recibe entradas ni conteos.',
    );
  });

  it('asks to reopen after an id conflict and when something no longer exists', () => {
    expect(
      movementErrorOf(apiError(409, 'movement_id_conflict')).general,
    ).toMatch(/vuelve a abrirlo/);
    expect(movementErrorOf(apiError(404, 'not_found')).general).toMatch(
      /ya no existen/,
    );
  });

  it('says to check the connection when no response arrived', () => {
    expect(movementErrorOf(new TypeError('Failed to fetch')).general).toMatch(
      /Revisa tu conexión/,
    );
  });
});
