import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { buildBuyer } from '@/test/factories';

import {
  buyerChangeErrorMessage,
  currentBuyerOf,
  duplicateBuyerOf,
  isBuyerWithRecords,
  isProducerInactive,
} from './buyer-errors';

const apiError = (status: number, code: string, extra = {}) =>
  new ApiError(status, {
    detail: 'Error de prueba.',
    code,
    fields: {},
    ...extra,
  });

describe('duplicateBuyerOf', () => {
  it('gives the buyer that already has the document', () => {
    const existing = { id: 'b1', name: 'Acopio La Ceiba', is_active: false };
    expect(
      duplicateBuyerOf(apiError(409, 'duplicate_document', { existing })),
    ).toEqual(existing);
  });

  it('is null for any other error', () => {
    expect(duplicateBuyerOf(apiError(409, 'stale_version'))).toBeNull();
    expect(duplicateBuyerOf(new TypeError('sin red'))).toBeNull();
  });
});

describe('currentBuyerOf', () => {
  it('gives the buyer as it is now on the server', () => {
    const current = buildBuyer({ version: 3 });
    expect(currentBuyerOf(apiError(409, 'stale_version', { current }))).toEqual(
      current,
    );
    expect(currentBuyerOf(apiError(409, 'duplicate_document'))).toBeNull();
  });
});

describe('isBuyerWithRecords and isProducerInactive', () => {
  it('recognize their codes', () => {
    expect(isBuyerWithRecords(apiError(409, 'buyer_has_records'))).toBe(true);
    expect(isBuyerWithRecords(apiError(409, 'stale_version'))).toBe(false);
    expect(isProducerInactive(apiError(422, 'producer_inactive'))).toBe(true);
  });
});

describe('buyerChangeErrorMessage', () => {
  it('asks to review the current data after a stale version', () => {
    expect(
      buyerChangeErrorMessage(apiError(409, 'stale_version'), 'Falló.'),
    ).toBe(
      'Otra persona cambió este comprador mientras tanto. Cierra y revisa sus datos actuales antes de intentarlo de nuevo.',
    );
  });

  it('uses the message of the server, or the fallback without one', () => {
    expect(
      buyerChangeErrorMessage(apiError(403, 'permission_denied'), 'Falló.'),
    ).toBe('Error de prueba.');
    expect(buyerChangeErrorMessage(new TypeError('sin red'), 'Falló.')).toBe(
      'Falló.',
    );
  });
});
