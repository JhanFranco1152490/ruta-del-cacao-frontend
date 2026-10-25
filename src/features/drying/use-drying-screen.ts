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

import { useDryings, useReadyLots } from './api';
import { type DryingView, useDryingFilters } from './use-drying-filters';
import { useQueuedLogs } from './use-log-queue';

export type DryingScreenState = ReturnType<typeof useDryingScreen>;

// Todo lo que Secado lee y decide antes de dibujarse. Los lotes en secado se leen también sin
// conexión, con la copia del dispositivo; los listos para secar, solo con conexión y para quien
// puede iniciar. La finca se filtra en el dispositivo.
export function useDryingScreen() {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const filters = useDryingFilters();
  const superuser = user?.is_superuser === true;
  // La cuenta técnica elige el productor; las demás ven el suyo.
  const producer = superuser ? filters.producer : null;
  const needsProducer = superuser && !producer;
  const canManage = hasPermission(user, PERMISSIONS.DRYING_MANAGE);
  const view: DryingView = canManage ? filters.view : 'en-secado';

  const read = useDryings(user?.id, producer, { enabled: !needsProducer });
  const offline = !hasConnection || read.data?.savedAt !== undefined;
  const ready = useReadyLots(producer, {
    enabled: canManage && !needsProducer && !offline,
  });
  const farms = useFarmOptions(user?.id, producer ?? undefined, {
    enabled: !needsProducer,
  });
  const selectedProducer = useProducerSummary(producer ?? undefined);
  const queued = useQueuedLogs(user?.id);

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
