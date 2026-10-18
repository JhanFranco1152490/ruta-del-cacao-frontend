'use client';

import { HarvestListScreen } from '@/features/harvests/components/harvest-list-screen';

import { renderFormLotInRow } from './form-lot';

export function HarvestList() {
  return <HarvestListScreen renderFormLot={renderFormLotInRow} />;
}
