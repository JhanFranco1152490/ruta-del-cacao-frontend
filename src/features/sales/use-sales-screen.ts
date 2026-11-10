'use client';

import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { useProducerSummary } from '@/lib/api/producer-options';
import { buyerTypeLabel } from '@/lib/buyer-types';
import { resolveFarmFilter } from '@/lib/farm-filter';
import { farmLabel } from '@/lib/format/place-label';

import type { SaleListItem } from './api';
import { registerOffer, salePermissionsOf } from './sale-actions';
import { salesRead } from './sales-read';
import { useBuyerOptions, useSales, useSalesSummary } from './queries';
import { useSaleFilters } from './use-sale-filters';

export type SalesScreenState = ReturnType<typeof useSalesScreen>;

// Los compradores del filtro: los activos que se pueden elegir al vender y los de las ventas que se
// ven (uno inactivo sigue en el historial). Sin repetir, por nombre.
function buyerFilterOptions(
  active: readonly { id: string; name: string; buyer_type: string }[],
  sales: readonly SaleListItem[],
) {
  const byId = new Map<
    string,
    { id: string; label: string; description: string }
  >();
  for (const buyer of [...active, ...sales.map(({ buyer }) => buyer)]) {
    if (byId.has(buyer.id)) continue;
    byId.set(buyer.id, {
      id: buyer.id,
      label: buyer.name,
      description: buyerTypeLabel(buyer.buyer_type),
    });
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
}

// Todo lo que Ventas lee y decide antes de dibujarse. La lista y las cifras se leen también sin
// conexión, con la copia del dispositivo; registrar necesita conexión.
export function useSalesScreen() {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const can = salePermissionsOf(user);
  const filters = useSaleFilters();
  const superuser = user?.is_superuser === true;
  // La cuenta técnica elige el productor; las demás ven el suyo.
  const producer = superuser ? filters.filters.producer : null;
  const needsProducer = superuser && !producer;
  const userId = needsProducer ? undefined : user?.id;

  const sales = useSales(userId, filters.filters);
  const summary = useSalesSummary(userId, filters.summaryFilters);
  const farms = useFarmOptions(user?.id, producer ?? undefined, {
    enabled: !needsProducer,
  });
  const activeBuyers = useBuyerOptions(
    producer,
    can.add && hasConnection && !needsProducer,
  );
  const selectedProducer = useProducerSummary(producer ?? undefined);

  const farmOptions = (farms.data?.data.options ?? []).map((farm) => ({
    id: farm.id,
    label: farmLabel(farm),
    name: farm.name,
  }));
  const read = salesRead(sales, summary, hasConnection);
  const rows = read.page?.results ?? [];
  const buyerOptions = buyerFilterOptions(activeBuyers.data ?? [], rows);
  const offline = !hasConnection || read.savedAt !== undefined;

  return {
    filters,
    can,
    superuser,
    producer,
    selectedProducer,
    needsProducer,
    sales,
    summaryData: read.summary,
    rows,
    total: read.page?.count ?? 0,
    savedAt: read.savedAt,
    offline,
    loading: read.loading,
    neverLoaded: read.neverLoaded,
    farmOptions,
    farm: resolveFarmFilter(farmOptions, filters.filters.farm),
    buyerOptions,
    buyer:
      buyerOptions.find(({ id }) => id === filters.filters.buyer) ??
      (filters.filters.buyer
        ? { id: filters.filters.buyer, label: 'Este comprador' }
        : null),
    register: registerOffer(can, !offline),
  };
}
