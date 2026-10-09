'use client';

import { CloudOff, Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { isNetworkFailure } from '@/lib/api/errors';
import { formatTimestamp } from '@/lib/format/dates';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import {
  type AgriculturalInput,
  useAgriculturalInputs,
  useInputStocks,
} from '../api';
import { buildInputRows } from '../input-rows';
import { useInputFilters } from '../use-input-filters';
import { type FarmChoice, InputFarmSelect } from './input-farm-select';
import { InputFiltersBar } from './input-filters-bar';
import type { InputActionKind } from './input-row-actions';
import { InputTable, type StockState } from './input-table';

export type FarmChoices = {
  // `undefined` mientras se cargan o si no se pudieron leer.
  choices?: readonly FarmChoice[];
  isLoading: boolean;
};

type PendingAction = {
  kind: InputActionKind | 'create';
  input?: AgriculturalInput;
};

function offlineMessage(savedAt: number | undefined) {
  const when = savedAt === undefined ? '' : ` del ${formatTimestamp(savedAt)}`;
  return `Sin conexión: puedes consultar los insumos y sus existencias${when}, pero registrar o editar necesita conexión.`;
}

// Las fincas llegan de la página: este dominio no lee las de otro.
export function InputListScreen({ farms }: { farms: FarmChoices }) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const filters = useInputFilters();
  const superuser = user?.is_superuser === true;
  const producer = superuser ? filters.producer : null;
  // La cuenta técnica ve todos los catálogos, pero las existencias son de la finca de un productor.
  const needsProducer = superuser && !producer;
  const catalog = useAgriculturalInputs(user?.id, producer);
  const choices = needsProducer ? undefined : farms.choices;
  // Una finca de la URL que no está entre las del productor (de otro, o eliminada) no se usa.
  const farm = needsProducer
    ? null
    : choices
      ? choices.some((choice) => choice.id === filters.farm)
        ? filters.farm
        : null
      : filters.farm;
  const stocks = useInputStocks(user?.id, farm);
  const [, setPending] = useState<PendingAction>();

  const savedAt = catalog.data?.savedAt;
  const offline = !hasConnection || savedAt !== undefined;
  const permissions = {
    canChange: hasPermission(user, PERMISSIONS.INPUTS_CHANGE),
    canDelete: hasPermission(user, PERMISSIONS.INPUTS_DELETE),
    canManageStock: hasPermission(user, PERMISSIONS.INPUTS_MANAGE_STOCK),
  };
  const canAdd = hasPermission(user, PERMISSIONS.INPUTS_ADD);
  const stockState: StockState = stocks.isSuccess
    ? 'ready'
    : stocks.isError || isPausedWithoutData(stocks)
      ? 'unavailable'
      : 'loading';

  const catalogInputs = catalog.data?.data ?? [];
  const rows = buildInputRows(
    catalogInputs,
    stocks.data?.data ?? [],
    filters.filters,
  );
  const neverLoaded =
    isPausedWithoutData(catalog) ||
    (catalog.isError && isNetworkFailure(catalog.error));

  const registerButton = canAdd && (
    <Button
      disabled={offline}
      onClick={() => setPending({ kind: 'create' })}
      size="office"
    >
      <Plus aria-hidden="true" className="size-5" /> Registrar insumo
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <PageHeader
        actions={catalog.isSuccess ? registerButton : undefined}
        description="Los insumos que usas en tus fincas y cuánto queda de cada uno en la bodega de cada finca."
        eyebrow="Inventario"
        title="Insumos"
      />
      {offline && catalog.isSuccess && (
        <p
          className="mt-6 flex gap-3 rounded-lg border border-border bg-card p-4 text-sm font-bold"
          role="status"
        >
          <CloudOff aria-hidden="true" className="size-5 shrink-0" />
          {offlineMessage(savedAt)}
        </p>
      )}
      <section className="mt-8 space-y-5 rounded-lg bg-card p-5 shadow-card">
        {needsProducer ? (
          <p className="text-sm text-muted-foreground">
            Elige un productor para ver las existencias de sus fincas.
          </p>
        ) : choices?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este productor aún no tiene fincas: las existencias se llevan por
            finca.
          </p>
        ) : (
          choices && (
            <InputFarmSelect
              farm={farm}
              farms={choices}
              onChange={filters.setFarm}
            />
          )
        )}
        <InputFiltersBar
          filters={filters.filters}
          onClear={filters.clear}
          onProducer={superuser ? filters.setProducer : undefined}
          onSearch={filters.setSearch}
          onStatus={filters.setStatus}
          onType={filters.setType}
          producer={producer}
        />

        {catalog.isPending && !neverLoaded && (
          <div aria-label="Cargando insumos" role="status">
            <Skeleton className="h-64" />
          </div>
        )}
        {neverLoaded && (
          <EmptyState
            description="Cuando tengas conexión, abre esta pantalla una vez y quedarán guardados para consultarlos sin conexión."
            title="Necesitas conexión una vez para cargar los insumos."
          />
        )}
        {catalog.isError && !neverLoaded && (
          <ErrorState
            message="No fue posible cargar los insumos."
            onRetry={() => void catalog.refetch()}
          />
        )}
        {catalog.isSuccess &&
          (catalogInputs.length === 0 ? (
            <EmptyState
              action={registerButton}
              description="Registra los fertilizantes, abonos y demás productos que usas para elegirlos al registrar una labor."
              title="Aún no hay insumos registrados"
            />
          ) : rows.length === 0 ? (
            <EmptyState
              description="Prueba con otro nombre o cambia los filtros."
              title="No se encontraron insumos"
            />
          ) : (
            <InputTable
              actionsDisabled={offline}
              farm={farm}
              onAction={(kind, input) => setPending({ kind, input })}
              permissions={permissions}
              rows={rows}
              showProducer={needsProducer}
              stockState={stockState}
            />
          ))}
      </section>
    </div>
  );
}
