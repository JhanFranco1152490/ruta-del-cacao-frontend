'use client';

import { CloudOff, PackageSearch, Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { InputSupplies } from '@/components/illustrations/input-supplies';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { isNetworkFailure } from '@/lib/api/errors';
import { isFarmEmployee, onlyFarmOf } from '@/lib/farm-scope';
import { notify } from '@/lib/notify';
import { formatTimestamp } from '@/lib/format/dates';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import {
  useAgriculturalInputs,
  useInputStocks,
  useInputStockTotals,
} from '../api';
import type { FarmChoice } from '../input-options';
import { buildInputRows } from '../input-rows';
import { useInputFilters } from '../use-input-filters';
import { farmSelectNote, InputFarmSelect } from './input-farm-select';
import { InputFiltersBar } from './input-filters-bar';
import { InputDialogs, type PendingAction } from './input-dialogs';
import { InputTable, type StockState } from './input-table';
import { pageContainerClass } from '@/components/page-container';

export type FarmChoices = {
  // `undefined` mientras se cargan o si no se pudieron leer.
  choices?: readonly FarmChoice[];
  isLoading: boolean;
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
  // Un empleado ve los insumos de sus fincas y trae a ellas los de otras con una entrada.
  const employee = isFarmEmployee(user);
  const producer = superuser ? filters.producer : null;
  // Las fincas se eligen dentro de un productor: la cuenta técnica sin uno elegido ve el total de
  // todos los catálogos y no puede escoger una finca.
  const needsProducer = superuser && !producer;
  const catalog = useAgriculturalInputs(user?.id, producer);
  const choices = needsProducer ? undefined : farms.choices;
  // Quien trabaja en una sola finca ve siempre sus existencias: no hay un total que elegir.
  const onlyFarm = onlyFarmOf(user);
  // Una finca de la URL que no está entre las del productor (de otro, o eliminada) no se usa.
  const farm = onlyFarm
    ? onlyFarm.id
    : needsProducer
      ? null
      : choices
        ? choices.some((choice) => choice.id === filters.farm)
          ? filters.farm
          : null
        : filters.farm;
  // Con una finca, sus existencias; sin ella, el total de todas las del alcance.
  const farmStocks = useInputStocks(user?.id, farm);
  const totalStocks = useInputStockTotals(user?.id, producer, {
    enabled: !farm,
  });
  const stocks = farm ? farmStocks : totalStocks;
  const [pending, setPending] = useState<PendingAction>();

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

  const catalogEntryButton = employee && permissions.canManageStock && (
    <Button
      disabled={offline}
      onClick={() => setPending({ kind: 'catalog-entry' })}
      size="office"
      variant="outline"
    >
      <PackageSearch aria-hidden="true" className="size-5" /> Entrada de otro
      insumo
    </Button>
  );

  return (
    <div className={pageContainerClass('wide')}>
      <PageHeader
        tone="selva"
        accent="cobre"
        actions={
          catalog.isSuccess ? (
            <>
              {catalogEntryButton}
              {registerButton}
            </>
          ) : undefined
        }
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
            Ves el total de todos los productores. Elige uno para ver las
            existencias de una finca en particular.
          </p>
        ) : choices?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este productor aún no tiene fincas: las existencias se llevan por
            finca.
          </p>
        ) : null}
        <InputFiltersBar
          farmSelect={
            !needsProducer &&
            !!choices?.length && (
              <InputFarmSelect
                fixed={!!onlyFarm}
                farm={farm}
                farms={choices}
                onChange={filters.setFarm}
              />
            )
          }
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
            illustration={OfflineCloud}
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
              illustration={InputSupplies}
              title="Aún no hay insumos registrados"
            />
          ) : rows.length === 0 ? (
            <EmptyState
              description="Prueba con otro nombre o cambia los filtros."
              illustration={InputSupplies}
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
              // Entrada y conteo piden una finca: la de la lista o la que se elija en el diálogo, y sin
              // productor elegido el insumo ya dice de cuál.
              stockFarms={!!farm || needsProducer || (choices?.length ?? 0) > 0}
              stockState={stockState}
            />
          ))}
        {catalog.isSuccess &&
          !needsProducer &&
          !!choices?.length &&
          rows.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {farmSelectNote(!!onlyFarm)}
            </p>
          )}
      </section>
      <InputDialogs
        catalog={catalogInputs}
        chooseProducer={superuser}
        employee={employee}
        farm={farm}
        farms={choices ?? []}
        onClose={() => setPending(undefined)}
        onSaved={(message) => {
          setPending(undefined);
          notify.success(message);
        }}
        onShowExisting={(existing) => {
          // Un empleado no lo ve en su lista si está en otra finca: se le ofrece traerlo con una
          // entrada.
          if (
            employee &&
            !catalogInputs.some((input) => input.id === existing.id)
          ) {
            setPending({ kind: 'catalog-entry', search: existing.name });
            return;
          }
          setPending(undefined);
          filters.showInput(existing);
        }}
        pending={pending}
        producer={producer}
      />
    </div>
  );
}
