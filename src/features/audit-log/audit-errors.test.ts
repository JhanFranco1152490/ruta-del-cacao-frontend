import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { AUDIT_FAILED_MESSAGE, auditErrors } from './audit-errors';

const apiError = (
  status: number,
  code: string,
  detail: string,
  fields: Record<string, string[]> = {},
) => new ApiError(status, { code, detail, fields });

describe('auditErrors', () => {
  it('puts a rejected period under the dates, with the server text', () => {
    const error = apiError(400, 'validation_error', 'Datos inválidos.', {
      to: ['Debe ser igual o posterior a `from`.'],
    });

    expect(auditErrors(error)).toEqual({
      period: 'Debe ser igual o posterior a `from`.',
      filter: null,
      notice: null,
    });
  });

  // Un enlace guardado puede traer una cuenta de otro productor o un tipo que ya no existe.
  it('says under the filters that a chosen user is not of the producer', () => {
    const error = apiError(404, 'not_found', 'No encontrado.', {
      actor: ['La cuenta no es de este productor.'],
    });

    expect(auditErrors(error)).toEqual({
      period: null,
      filter: 'La cuenta no es de este productor.',
      notice: null,
    });
  });

  it('says under the filters that a record type is unknown', () => {
    const error = apiError(400, 'validation_error', 'Datos inválidos.', {
      record_type: ['«x» no es una opción válida.'],
    });

    expect(auditErrors(error).filter).toBe('«x» no es una opción válida.');
  });

  it('turns a missing permission into a notice with the server text', () => {
    const error = apiError(
      403,
      'permission_denied',
      'No tienes permiso para realizar esta acción.',
    );

    expect(auditErrors(error)).toEqual({
      period: null,
      filter: null,
      notice: 'No tienes permiso para realizar esta acción.',
    });
  });

  it('turns a rejected producer into a notice: there is no producer field to mark', () => {
    const error = apiError(404, 'not_found', 'El productor no existe.', {
      producer: ['El productor no existe.'],
    });

    expect(auditErrors(error).notice).toBe('El productor no existe.');
  });

  it('has a message of its own when the server did not answer', () => {
    expect(auditErrors(new TypeError('Failed to fetch'))).toEqual({
      period: null,
      filter: null,
      notice: AUDIT_FAILED_MESSAGE,
    });
    expect(AUDIT_FAILED_MESSAGE).toBe('No fue posible cargar la bitácora.');
  });
});
