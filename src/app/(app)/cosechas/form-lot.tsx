'use client';

import type { ReactNode } from 'react';

import type { HarvestLotSource } from '@/features/harvests/harvest-lot-source';
import { FormLotDialog } from '@/features/lots/components/form-lot-dialog';

// Cosechas y lotes no se importan entre sí: aquí se une la cosecha con quien conforma su lote.
export const renderFormLot = (source: HarvestLotSource) => (
  <FormLotDialog source={source} />
);

export function renderFormLotReturningTo(returnTo: string) {
  return function renderFormLotThere(source: HarvestLotSource) {
    return <FormLotDialog returnTo={returnTo} source={source} />;
  };
}

export const renderFormLotInRow = (
  source: HarvestLotSource,
  unavailable: ReactNode,
) => <FormLotDialog compact source={source} unavailable={unavailable} />;
