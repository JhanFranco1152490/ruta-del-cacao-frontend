import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { generateQrErrorMessage, isQrAlreadyGenerated } from './qr-errors';

const apiError = (status: number, code: string) =>
  new ApiError(status, { detail: 'Detalle del servidor.', code, fields: {} });

describe('isQrAlreadyGenerated', () => {
  it('recognizes the conflict of a lot that already has its code', () => {
    expect(isQrAlreadyGenerated(apiError(409, 'lot_qr_already_exists'))).toBe(
      true,
    );
  });

  it('does not take any other failure for it', () => {
    expect(isQrAlreadyGenerated(apiError(409, 'lot_not_classified'))).toBe(
      false,
    );
    expect(isQrAlreadyGenerated(new Error('red'))).toBe(false);
  });
});

describe('generateQrErrorMessage', () => {
  it('says the lot is gone on a 404', () => {
    expect(generateQrErrorMessage(apiError(404, 'not_found'))).toBe(
      'Este lote ya no existe.',
    );
  });

  it('says the lot changed state when it is no longer classified', () => {
    expect(generateQrErrorMessage(apiError(409, 'lot_not_classified'))).toBe(
      'El lote cambió de estado: ya no puede tener código QR.',
    );
  });

  it('uses the server message for another rejection', () => {
    expect(generateQrErrorMessage(apiError(403, 'permission_denied'))).toBe(
      'Detalle del servidor.',
    );
  });

  it('asks to check the connection when the request never arrived', () => {
    expect(generateQrErrorMessage(new TypeError('Failed to fetch'))).toContain(
      'Revisa tu conexión',
    );
  });
});
