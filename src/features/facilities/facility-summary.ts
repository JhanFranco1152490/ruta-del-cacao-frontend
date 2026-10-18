import {
  agreeWith,
  FACILITY_TYPE_ORDER,
  type FacilityType,
} from '@/lib/facility-labels';

import type { PostharvestFacility } from './api';
import { sortFacilities } from './facility-order';

export type TypeSummary = {
  available: number;
  occupied: number;
  inactive: number;
  active: number;
};

export type LotInProcess = { lotId: string; lotCode: string; facility: string };

const emptySummary = (): TypeSummary => ({
  available: 0,
  occupied: 0,
  inactive: 0,
  active: 0,
});

// Los números de las tarjetas de arriba de la lista, sobre lo que ya filtró la persona.
export function summarizeFacilities(
  facilities: readonly PostharvestFacility[],
) {
  const byType = Object.fromEntries(
    FACILITY_TYPE_ORDER.map((type) => [type, emptySummary()]),
  ) as Record<FacilityType, TypeSummary>;
  const inProcess: LotInProcess[] = [];

  for (const facility of sortFacilities(facilities)) {
    const summary = byType[facility.facility_type];
    summary[facility.status] += 1;
    if (facility.is_active) summary.active += 1;
    if (facility.occupied_by) {
      inProcess.push({
        lotId: facility.occupied_by.lot.id,
        lotCode: facility.occupied_by.lot.code,
        facility: facility.name,
      });
    }
  }
  return { byType, inProcess };
}

// Concuerda en género con el tipo y en número con la cifra: «1 ocupado», «2 inactivas».
const agree = (type: FacilityType, stem: string, count: number) =>
  `${agreeWith(type, stem)}${count === 1 ? '' : 's'}`;

export const availabilityText = (type: FacilityType, summary: TypeSummary) =>
  `${summary.available} de ${summary.active} ${agree(type, 'activ', summary.active)}`;

export const breakdownText = (type: FacilityType, summary: TypeSummary) =>
  [
    summary.occupied &&
      `${summary.occupied} ${agree(type, 'ocupad', summary.occupied)}`,
    summary.inactive &&
      `${summary.inactive} ${agree(type, 'inactiv', summary.inactive)}`,
  ]
    .filter(Boolean)
    .join(' · ');

export const inProcessText = (inProcess: readonly LotInProcess[]) =>
  inProcess.length === 0
    ? 'Ninguno'
    : inProcess.map((lot) => `${lot.lotCode} en ${lot.facility}`).join(' · ');

const PLURALS: Record<FacilityType, [string, string]> = {
  fermentation_box: ['cajón', 'cajones'],
  solar_dryer: ['marquesina', 'marquesinas'],
};

// Lo que tiene cada finca en la tarjeta para elegirla: «2 cajones · 2 marquesinas · 2 en uso».
// Cuenta también los inactivos: siguen siendo de la finca.
export function farmContentsText(facilities: readonly PostharvestFacility[]) {
  if (facilities.length === 0) return 'Sin cajones ni marquesinas';
  const parts = FACILITY_TYPE_ORDER.map((type) => {
    const count = facilities.filter((f) => f.facility_type === type).length;
    const [one, many] = PLURALS[type];
    return count ? `${count} ${count === 1 ? one : many}` : '';
  });
  const inUse = facilities.filter((f) => f.status === 'occupied').length;
  if (inUse) parts.push(`${inUse} en uso`);
  return parts.filter(Boolean).join(' · ');
}
