'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { useFinishSave } from '@/hooks/use-finish-save';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { useProducerSummary } from '@/lib/api/producer-options';
import { buyerTypeLabel } from '@/lib/buyer-types';
import { todayInBogota } from '@/lib/format/dates';
import { farmLabel } from '@/lib/format/place-label';

import { salePermissionsOf } from './sale-actions';
import { SALES_PATH } from './sale-paths';
import { useBuyerOptions } from './queries';

export type SaleFormScreenState = ReturnType<typeof useSaleFormScreen>;

// Lo que el formulario de una venta necesita antes de dibujarse: quién registra, de qué productor
// (la cuenta técnica lo elige primero), las fincas donde se puede vender y los compradores activos.
// Todo con conexión: sin ella no se registra.
export function useSaleFormScreen() {
  const { data: user } = useSession();
  const online = useHasConnection();
  const params = useSearchParams();
  const can = salePermissionsOf(user);
  const superuser = user?.is_superuser === true;
  const [producer, setProducer] = useState<string | null>(null);
  const needsProducer = superuser && !producer;
  const scope = superuser ? (producer ?? undefined) : undefined;

  const farms = useFarmOptions(user?.id, scope, { enabled: !needsProducer });
  const buyers = useBuyerOptions(
    superuser ? producer : null,
    online && !needsProducer,
  );
  const selectedProducer = useProducerSummary(scope);
  const { returnPath, finish } = useFinishSave(SALES_PATH);

  // Una finca inactiva no vende: se ofrecen solo las activas.
  const farmOptions = (farms.data?.data.options ?? [])
    .filter((farm) => farm.isActive)
    .map((farm) => ({ id: farm.id, label: farmLabel(farm), name: farm.name }));
  const buyerOptions = (buyers.data ?? []).map((buyer) => ({
    id: buyer.id,
    label: buyer.name,
    description: buyerTypeLabel(buyer.buyer_type),
  }));
  // La finca con la que se abrió (desde el filtro de la lista), o la única que hay.
  const requested = params?.get('finca') ?? '';
  const initialFarmId = farmOptions.some(({ id }) => id === requested)
    ? requested
    : farmOptions.length === 1
      ? farmOptions[0].id
      : '';

  return {
    user,
    online,
    can,
    superuser,
    producer,
    setProducer,
    selectedProducer,
    needsProducer,
    today: todayInBogota(),
    farms,
    farmOptions,
    initialFarmId,
    buyers,
    buyerOptions,
    returnPath,
    finish,
  };
}
