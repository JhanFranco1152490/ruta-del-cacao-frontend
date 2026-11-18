import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { REPORT_ERROR } from './api';
import { REPORT_FAILED_MESSAGE, reportErrors } from './report-errors';

const apiError = (
  status: number,
  code: string,
  detail: string,
  fields: Record<string, string[]> = {},
) => new ApiError(status, { code, detail, fields });

describe('reportErrors', () => {
  it('puts a rejected filter in its own field, with the server text', () => {
    const error = apiError(
      404,
      'not_found',
      'Un filtro del reporte no existe.',
      {
        plot: ['La parcela no existe.'],
      },
    );

    expect(reportErrors(error)).toEqual({
      fields: { plot: 'La parcela no existe.' },
      notice: null,
    });
  });

  it('puts an error of either date under the period', () => {
    const error = apiError(400, 'validation_error', 'Datos inválidos.', {
      to: ['El periodo no puede superar 366 días.'],
    });

    expect(reportErrors(error).fields).toEqual({
      period: 'El periodo no puede superar 366 días.',
    });
  });

  // El PDF admite menos filas que Excel y CSV: el servidor dice qué hacer.
  it('shows what is not a filter as a notice, with the server text', () => {
    const error = apiError(
      400,
      REPORT_ERROR.tooLarge,
      'El reporte tiene demasiadas filas. Acota el periodo, la finca o la parcela.',
    );

    expect(reportErrors(error)).toEqual({
      fields: {},
      notice:
        'El reporte tiene demasiadas filas. Acota el periodo, la finca o la parcela.',
    });
  });

  it('shows a permission error as a notice', () => {
    const error = apiError(
      403,
      'permission_denied',
      'No tienes permiso para consultar la información de este reporte.',
    );

    expect(reportErrors(error).notice).toBe(
      'No tienes permiso para consultar la información de este reporte.',
    );
  });

  it('keeps a field the screen does not have out of the fields', () => {
    const error = apiError(400, 'validation_error', 'Datos inválidos.', {
      file: ['Elija un formato válido.'],
    });

    expect(reportErrors(error)).toEqual({
      fields: {},
      notice: 'Datos inválidos.',
    });
  });

  it('falls back to a general message without a server answer', () => {
    expect(reportErrors(new TypeError('Failed to fetch'))).toEqual({
      fields: {},
      notice: REPORT_FAILED_MESSAGE,
    });
  });
});
