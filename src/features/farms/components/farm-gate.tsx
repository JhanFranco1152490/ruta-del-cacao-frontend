'use client';

import type { ReactNode } from 'react';

import { producerLabelOf } from '../farm-list-item';
import { farmDetailPath, farmEditPath } from '../farm-paths';
import { useFarmSource } from '../use-farm-source';
import type { FarmPlotsContext } from './farm-detail-screen';
import { FarmScreenSkeleton, FarmUnavailable } from './farm-screen-states';

export type GatedFarm = FarmPlotsContext & {
  // Dónde ver la finca: a donde vuelve quien termina de trabajar sobre ella.
  detailPath: string;
  // Dónde editar la finca (p. ej. para ampliar su área).
  editPath: string;
  // Todavía no existe en el servidor (se creó sin conexión): sus parcelas esperan a que llegue.
  isPendingCreate: boolean;
};

// Carga la finca de una pantalla que trabaja sobre ella (el editor de parcelas) y solo entonces
// pinta lo que sigue: con la finca del servidor, con su copia sin conexión o con la que está
// pendiente en el dispositivo. Los otros dominios la usan sin conocer cómo se lee una finca.
export function FarmGate({
  id,
  children,
}: {
  id: string;
  children: (farm: GatedFarm) => ReactNode;
}) {
  const source = useFarmSource(id);

  switch (source.status) {
    case 'loading':
      return <FarmScreenSkeleton />;
    case 'error':
      return <FarmUnavailable message={source.message} />;
    case 'queued': {
      const { queued } = source;
      return children({
        id: queued.id,
        name: queued.values.name,
        areaHectares: queued.values.area_hectares,
        location: {
          latitude: queued.values.latitude,
          longitude: queued.values.longitude,
        },
        isActive: true,
        detailPath: farmDetailPath(queued.id),
        editPath: farmEditPath(queued.id),
        isPendingCreate: queued.operation === 'create',
      });
    }
    case 'server': {
      const { farm } = source;
      return children({
        id: farm.id,
        name: farm.name,
        areaHectares: farm.area_hectares,
        allocatedAreaHectares: farm.allocated_area_hectares,
        location: farm.location,
        isActive: farm.is_active,
        producerLabel: producerLabelOf(farm.producer),
        detailPath: farmDetailPath(farm.id),
        editPath: farmEditPath(farm.id),
        isPendingCreate: false,
      });
    }
  }
}
