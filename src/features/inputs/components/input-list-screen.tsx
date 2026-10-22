'use client';

import { CloudOff, PackageSearch, Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { InputSupplies } from '@/components/illustrations/input-supplies';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import { formatTimestamp } from '@/lib/format/dates';

import type { AgriculturalInput } from '../api';
import type { FarmChoice } from '../input-options';
import { useInputList } from '../use-input-list';
import { farmSelectNote, InputFarmSelect } from './input-farm-select';
import { InputFiltersBar } from './input-filters-bar';
import { InputDialogs, type PendingAction } from './input-dialogs';
import type { InputActionKind } from './input-row-actions';
import { InputTable } from './input-table';
import { pageContainerClass } from '@/components/page-container';
import { LoadingBlock } from '@/components/loading-block';

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
  const list = useInputList(farms.choices);
  const {
    filters,
    superuser,
    employee,
    producer,
    needsProducer,
    choices,
    onlyFarm,
    farm,
    catalog,
    catalogInputs,
    rows,
    offline,
    savedAt,
    canAdd,
    permissions,
  } = list;
  const [pending, setPending] = useState<PendingAction>();

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

        <InputCatalogStates
          list={list}
          onAction={(kind, input) => setPending({ kind, input })}
          registerButton={registerButton}
        />
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

// Lo que va en lugar de la tabla mientras el catálogo carga, si nunca se cargó, si falló o si está
// vacío; y la tabla cuando hay filas.
function InputCatalogStates({
  list,
  registerButton,
  onAction,
}: {
  list: ReturnType<typeof useInputList>;
  registerButton: ReactNode;
  onAction: (kind: InputActionKind, input: AgriculturalInput) => void;
}) {
  const {
    catalog,
    catalogInputs,
    rows,
    neverLoaded,
    farm,
    needsProducer,
    choices,
  } = list;
  if (neverLoaded) {
    return (
      <EmptyState
        description="Cuando tengas conexión, abre esta pantalla una vez y quedarán guardados para consultarlos sin conexión."
        illustration={OfflineCloud}
        title="Necesitas conexión una vez para cargar los insumos."
      />
    );
  }
  if (catalog.isPending) {
    return <LoadingBlock label="Cargando insumos" shapes={['h-64']} />;
  }
  if (catalog.isError) {
    return (
      <ErrorState
        message="No fue posible cargar los insumos."
        onRetry={() => void catalog.refetch()}
      />
    );
  }
  if (catalogInputs.length === 0) {
    return (
      <EmptyState
        action={registerButton}
        description="Registra los fertilizantes, abonos y demás productos que usas para elegirlos al registrar una labor."
        illustration={InputSupplies}
        title="Aún no hay insumos registrados"
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        description="Prueba con otro nombre o cambia los filtros."
        illustration={InputSupplies}
        title="No se encontraron insumos"
      />
    );
  }
  return (
    <InputTable
      actionsDisabled={list.offline}
      farm={farm}
      onAction={onAction}
      permissions={list.permissions}
      rows={rows}
      showProducer={needsProducer}
      // Entrada y conteo piden una finca: la de la lista o la que se elija en el diálogo, y sin
      // productor elegido el insumo ya dice de cuál.
      stockFarms={!!farm || needsProducer || (choices?.length ?? 0) > 0}
      stockState={list.stockState}
    />
  );
}
