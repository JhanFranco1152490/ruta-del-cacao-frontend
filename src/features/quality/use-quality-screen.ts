'use client';

import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { useProducerSummary } from '@/lib/api/producer-options';
import { resolveFarmFilter } from '@/lib/farm-filter';
import { farmLabel } from '@/lib/format/place-label';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useQualityLots, useQualitySummary } from './api';
import type { QualityPermissions } from './quality-actions';
import { useQualityFilters } from './use-quality-filters';

export type QualityScreenState = ReturnType<typeof useQualityScreen>;

// Todo lo que Calidad lee y decide antes de dibujarse. La lista y las cifras se leen también sin
// conexión, con la copia del dispositivo; registrar necesita conexión.
export function useQualityScreen() {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const filters = useQualityFilters();
  const superuser = user?.is_superuser === true;
  // La cuenta técnica elige el productor; las demás ven el suyo.
  const producer = superuser ? filters.filters.producer : null;
  const needsProducer = superuser && !producer;
  const userId = needsProducer ? undefined : user?.id;

  const list = useQualityLots(userId, filters.apiView, filters.filters);
  const summary = useQualitySummary(userId, filters.summaryFilters);
  const farms = useFarmOptions(user?.id, producer ?? undefined, {
    enabled: !needsProducer,
  });
  const selectedProducer = useProducerSummary(producer ?? undefined);

  const farmOptions = (farms.data?.data.options ?? []).map((farm) => ({
    id: farm.id,
    label: farmLabel(farm),
    name: farm.name,
  }));
  const can: QualityPermissions = {
    evaluate: hasPermission(user, PERMISSIONS.QUALITY_EVALUATE),
    classify: hasPermission(user, PERMISSIONS.QUALITY_CLASSIFY),
    discard: hasPermission(user, PERMISSIONS.QUALITY_DISCARD),
  };

  return {
    filters,
    superuser,
    producer,
    selectedProducer,
    needsProducer,
    list,
    summary,
    offline: !hasConnection || list.data?.savedAt !== undefined,
    can,
    farmOptions,
    farm: resolveFarmFilter(farmOptions, filters.filters.farm),
  };
}
