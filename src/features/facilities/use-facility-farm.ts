'use client';

import { useMemo } from 'react';

import { useFarmOptions } from '@/lib/api/farm-options';

import { initialFarm, type InitialFarm } from './initial-farm';
import { readLastFarm, rememberLastFarm } from './last-farm';
import { useFacilityFilters } from './use-facility-filters';

export type FacilityFarmResolution =
  | InitialFarm
  // La cuenta técnica elige primero el productor.
  | { kind: 'producer' }
  | { kind: 'loading' }
  // Las fincas no llegaron (sin red y sin copia, o un error de la API): `farmOptions.error` dice
  // cuál.
  | { kind: 'error' };

// Qué finca muestra la lista de cajones y marquesinas, o si hay que preguntarla. Las fincas son las
// activas que la cuenta alcanza, con su código, y salen de la misma lista que usan los filtros de
// finca de la app, con su copia para abrir sin conexión. `elementFarm` es la finca del elemento de
// `?elemento=`: manda sobre la de la URL, porque el elemento se muestra en la suya.
export function useFacilityFarm(
  userId: string | undefined,
  superuser: boolean,
  elementFarm: string | null = null,
) {
  const state = useFacilityFilters();
  const producer = superuser ? state.producer : null;
  const needsProducer = superuser && !producer;
  const farmOptions = useFarmOptions(userId, producer ?? undefined, {
    enabled: !needsProducer,
  });

  const farms = useMemo(
    () =>
      (farmOptions.data?.data.options ?? []).filter((farm) => farm.isActive),
    [farmOptions.data],
  );

  const resolution: FacilityFarmResolution = needsProducer
    ? { kind: 'producer' }
    : farmOptions.isPending
      ? { kind: 'loading' }
      : !farmOptions.data
        ? { kind: 'error' }
        : initialFarm({
            farms: farms.map(({ id }) => id),
            urlFarm: elementFarm ?? state.farm,
            choose: state.choose,
            remembered: userId ? readLastFarm(userId) : null,
          });

  const farmId = resolution.kind === 'farm' ? resolution.farmId : null;

  return {
    resolution,
    farms,
    farm: farms.find(({ id }) => id === farmId),
    producer,
    farmOptions,
    // Con una sola finca no hay a dónde volver: no se ofrece «‹ Fincas».
    canSwitchFarm: farms.length > 1,
    choose: (id: string) => {
      if (userId) rememberLastFarm(userId, id);
      return state.openFarm(id);
    },
  };
}
