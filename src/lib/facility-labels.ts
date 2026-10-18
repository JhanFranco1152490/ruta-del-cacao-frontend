import { Box, Flame, type LucideIcon, Sun, Warehouse } from 'lucide-react';

import { TONE_ICONS, type Tone } from '@/components/status-badge';
import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

export type FacilityType = Schemas['FacilityTypeEnum'];
export type FacilityStatus = Schemas['PostharvestFacilityStatusEnum'];

type FacilityTypeInfo = {
  label: string;
  // Cómo se elige al registrar: dice para qué sirve.
  purpose: string;
  noun: string;
  article: 'el' | 'la';
  // Los procesos que lo usan, para los textos de activar y desactivar.
  processes: string;
  feminine: boolean;
  Icon: LucideIcon;
  // El ícono de su proceso en curso, que muestra el estado Ocupado.
  busyIcon: LucideIcon;
};

// Infraestructura, fermentación y secado leen de aquí cómo se llama cada tipo, para que un cajón
// se nombre igual en todas las pantallas.
export const FACILITY_TYPES: Record<FacilityType, FacilityTypeInfo> = {
  fermentation_box: {
    label: 'Cajón',
    purpose: 'Cajón para fermentar',
    noun: 'cajón',
    article: 'el',
    processes: 'fermentaciones',
    feminine: false,
    Icon: Box,
    busyIcon: Flame,
  },
  solar_dryer: {
    label: 'Marquesina',
    purpose: 'Marquesina para secar',
    noun: 'marquesina',
    article: 'la',
    processes: 'secados',
    feminine: true,
    Icon: Warehouse,
    busyIcon: Sun,
  },
};

export const FACILITY_TYPE_ORDER = Object.keys(
  FACILITY_TYPES,
) as FacilityType[];

export const facilityName = (type: FacilityType, name: string) => {
  const { article, noun } = FACILITY_TYPES[type];
  return `${article} ${noun} ${name}`;
};

export const FACILITY_STATUS_ORDER: readonly FacilityStatus[] = [
  'available',
  'occupied',
  'inactive',
];

type FacilityStatusInfo = { label: string; tone: Tone; Icon: LucideIcon };

// La etiqueta concuerda con el tipo (cajón ocupado, marquesina ocupada). Sin tipo, como en los
// filtros, va en masculino.
export function facilityStatus(
  status: FacilityStatus,
  type?: FacilityType,
): FacilityStatusInfo {
  const ending = type && FACILITY_TYPES[type].feminine ? 'a' : 'o';
  switch (status) {
    case 'available':
      return { label: 'Disponible', tone: 'ok', Icon: TONE_ICONS.ok };
    case 'occupied':
      return {
        label: `Ocupad${ending}`,
        tone: 'info',
        Icon: type ? FACILITY_TYPES[type].busyIcon : TONE_ICONS.info,
      };
    case 'inactive':
      return { label: `Inactiv${ending}`, tone: 'warn', Icon: TONE_ICONS.warn };
  }
}
