'use client';

import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { isNetworkFailure } from '@/lib/api/errors';
import { isFarmEmployee, onlyFarmOf } from '@/lib/farm-scope';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import {
  useAgriculturalInputs,
  useInputStocks,
  useInputStockTotals,
} from './api';
import type { FarmChoice } from './input-options';
import { buildInputRows } from './input-rows';
import { useInputFilters } from './use-input-filters';

export type StockState = 'ready' | 'unavailable' | 'loading';

// De qué finca se ven las existencias. Quien trabaja en una sola finca ve siempre la suya. La
// cuenta técnica sin un productor elegido ve el total de todos: no hay finca que escoger. Una finca
// de la dirección que no está entre las del productor (de otro, o eliminada) no se usa; mientras
// las fincas cargan, se respeta la de la dirección.
export function resolveStockFarm({
  onlyFarmId,
  needsProducer,
  choices,
  requested,
}: {
  onlyFarmId: string | null;
  needsProducer: boolean;
  choices: readonly FarmChoice[] | undefined;
  requested: string | null;
}): string | null {
  if (onlyFarmId) return onlyFarmId;
  if (needsProducer) return null;
  if (!choices) return requested;
  return choices.some((choice) => choice.id === requested) ? requested : null;
}

// Todo lo que la lista de insumos lee y decide antes de dibujarse: el catálogo, las existencias de
// la finca elegida (o el total del alcance), las filas filtradas y qué puede hacer quien mira.
export function useInputList(farmChoices: readonly FarmChoice[] | undefined) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const filters = useInputFilters();
  const superuser = user?.is_superuser === true;
  const producer = superuser ? filters.producer : null;
  // Las fincas se eligen dentro de un productor.
  const needsProducer = superuser && !producer;
  const choices = needsProducer ? undefined : farmChoices;
  const onlyFarm = onlyFarmOf(user);
  const farm = resolveStockFarm({
    onlyFarmId: onlyFarm?.id ?? null,
    needsProducer,
    choices,
    requested: filters.farm,
  });

  const catalog = useAgriculturalInputs(user?.id, producer);
  const farmStocks = useInputStocks(user?.id, farm);
  const totalStocks = useInputStockTotals(user?.id, producer, {
    enabled: !farm,
  });
  const stocks = farm ? farmStocks : totalStocks;
  const stockState: StockState = stocks.isSuccess
    ? 'ready'
    : stocks.isError || isPausedWithoutData(stocks)
      ? 'unavailable'
      : 'loading';

  const savedAt = catalog.data?.savedAt;
  const catalogInputs = catalog.data?.data ?? [];
  return {
    filters,
    superuser,
    // Un empleado ve los insumos de sus fincas y trae a ellas los de otras con una entrada.
    employee: isFarmEmployee(user),
    producer,
    needsProducer,
    choices,
    onlyFarm,
    farm,
    catalog,
    catalogInputs,
    rows: buildInputRows(
      catalogInputs,
      stocks.data?.data ?? [],
      filters.filters,
    ),
    stockState,
    savedAt,
    offline: !hasConnection || savedAt !== undefined,
    neverLoaded:
      isPausedWithoutData(catalog) ||
      (catalog.isError && isNetworkFailure(catalog.error)),
    canAdd: hasPermission(user, PERMISSIONS.INPUTS_ADD),
    permissions: {
      canChange: hasPermission(user, PERMISSIONS.INPUTS_CHANGE),
      canDelete: hasPermission(user, PERMISSIONS.INPUTS_DELETE),
      canManageStock: hasPermission(user, PERMISSIONS.INPUTS_MANAGE_STOCK),
    },
  };
}
