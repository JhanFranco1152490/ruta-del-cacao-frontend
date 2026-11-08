import { isApiError } from '@/lib/api/errors';

import type { Buyer, ExistingBuyer } from './api';

export const BUYER_ERROR = {
  duplicateDocument: 'duplicate_document',
  hasRecords: 'buyer_has_records',
  producerInactive: 'producer_inactive',
  staleVersion: 'stale_version',
} as const;

// El comprador que ya tiene el documento, para ofrecer verlo o activarlo.
export function duplicateBuyerOf(error: unknown): ExistingBuyer | null {
  if (!isApiError(error) || error.code !== BUYER_ERROR.duplicateDocument) {
    return null;
  }
  return (error.body.existing as ExistingBuyer | undefined) ?? null;
}

// El comprador como está ahora en el servidor, cuando otra persona lo cambió primero.
export function currentBuyerOf(error: unknown): Buyer | null {
  if (!isApiError(error) || error.code !== BUYER_ERROR.staleVersion) {
    return null;
  }
  return (error.body.current as Buyer | undefined) ?? null;
}

// Alguien registró una venta con él después de cargar la lista: ya no se elimina.
export const isBuyerWithRecords = (error: unknown) =>
  isApiError(error) && error.code === BUYER_ERROR.hasRecords;

export const isProducerInactive = (error: unknown) =>
  isApiError(error) && error.code === BUYER_ERROR.producerInactive;
