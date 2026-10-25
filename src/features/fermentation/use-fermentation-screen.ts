'use client';

import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { useProducerSummary } from '@/lib/api/producer-options';
import {
  lotsOfFarm,
  processesOfFarm,
  resolveFarmFilter,
} from '@/lib/farm-filter';
import { farmLabel } from '@/lib/format/place-label';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useFermentations, useReadyLots } from './api';
import {
  type FermentationView,
  useFermentationFilters,
} from './use-fermentation-filters';
import { useQueuedTurns } from './use-turn-queue';

export type FermentationScreenState = ReturnType<typeof useFermentationScreen>;

// Todo lo que Fermentación lee y decide antes de dibujarse. Los lotes en fermentación se leen
// también sin conexión, con la copia del dispositivo; los listos para fermentar, solo con conexión
// y para quien puede iniciar. La finca se filtra en el dispositivo.
export function useFermentationScreen() {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const filters = useFermentationFilters();
  const superuser = user?.is_superuser === true;
  // La cuenta técnica elige el productor; las demás ven el suyo.
  const producer = superuser ? filters.producer : null;
  const needsProducer = superuser && !producer;
  const canManage = hasPermission(user, PERMISSIONS.FERMENTATION_MANAGE);
  const view: FermentationView = canManage ? filters.view : 'en-curso';

  const read = useFermentations(user?.id, producer, {
    enabled: !needsProducer,
  });
  const offline = !hasConnection || read.data?.savedAt !== undefined;
  const ready = useReadyLots(producer, {
    enabled: canManage && !needsProducer && !offline,
  });
  const farms = useFarmOptions(user?.id, producer ?? undefined, {
    enabled: !needsProducer,
  });
  const selectedProducer = useProducerSummary(producer ?? undefined);
  const queued = useQueuedTurns(user?.id);

  const farmOptions = (farms.data?.data.options ?? []).map((farm) => ({
    id: farm.id,
    label: farmLabel(farm),
    name: farm.name,
  }));
  const readyShown =
    canManage && !offline && ready.data
      ? lotsOfFarm(ready.data, filters.farm)
      : undefined;

  return {
    filters,
    superuser,
    producer,
    selectedProducer,
    needsProducer,
    canManage,
    canSeeFacilities: hasPermission(user, PERMISSIONS.FACILITIES_VIEW),
    view,
    read,
    ready,
    offline,
    queued,
    farmOptions,
    farm: resolveFarmFilter(farmOptions, filters.farm),
    shown: processesOfFarm(read.data?.data ?? [], filters.farm),
    readyShown,
  };
}
