'use client';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FilterRow } from '@/components/filter-row';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { Skeleton } from '@/components/ui/skeleton';

import { usePestDiseaseCatalog } from '../pest-api';
import { matchesPestFilters, PEST_DISEASE_KIND_LABELS } from '../pest-filters';
import { usePestFilters } from '../use-pest-filters';
import { PestFormDialog } from './pest-form-dialog';
import { PestStatusDialog } from './pest-status-dialog';

const COLUMNS = 'md:grid-cols-[13rem_7rem_minmax(0,1fr)_minmax(0,1.6fr)_13rem]';

// Catálogo de la asociación: quien lo administra registra, edita, activa y desactiva. No se
// eliminan aquí, porque los monitoreos las usan. Son pocas filas: se lee completo y se filtra en el
// dispositivo, sin páginas.
export function PestListScreen() {
  const catalog = usePestDiseaseCatalog();
  const { search, status, setSearch, setStatus } = usePestFilters();
  const items = catalog.data ?? [];
  const shown = items.filter((item) =>
    matchesPestFilters(item, search, status),
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <PageHeader
        actions={
          catalog.isSuccess ? <PestFormDialog catalog={items} /> : undefined
        }
        description="Lo que el capataz elige al registrar un monitoreo. La descripción le ayuda a reconocerla en campo."
        eyebrow="Administración"
        title="Plagas y enfermedades"
      />
      <section className="mt-8 space-y-5 rounded-lg bg-card p-5 shadow-card">
        <FilterRow
          activeCount={status ? 1 : 0}
          search={
            <TextField
              hideLabel
              label="Buscar plagas y enfermedades"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o nombre científico"
              type="search"
              value={search}
              wrapperClassName="min-w-0 flex-1 sm:min-w-72"
            />
          }
          trailing={
            catalog.isSuccess && (
              <p className="self-center text-sm font-bold text-muted-foreground sm:ml-auto">
                {shown.length === 1
                  ? '1 plaga o enfermedad'
                  : `${shown.length} plagas y enfermedades`}
              </p>
            )
          }
        >
          <SelectField
            hideLabel
            label="Filtrar por estado"
            onChange={(event) => setStatus(event.target.value)}
            value={status ?? ''}
            wrapperClassName="w-full sm:w-52"
          >
            <option value="">Todas</option>
            <option value="activas">Activas</option>
            <option value="inactivas">Inactivas</option>
          </SelectField>
        </FilterRow>

        {catalog.isPending && (
          <div aria-label="Cargando plagas y enfermedades" role="status">
            <Skeleton className="h-64" />
          </div>
        )}
        {catalog.isError && (
          <ErrorState
            message="No fue posible cargar las plagas y enfermedades."
            onRetry={() => void catalog.refetch()}
          />
        )}
        {catalog.isSuccess &&
          (shown.length ? (
            <>
              <div
                aria-hidden="true"
                className={`hidden gap-x-4 px-1 text-xs font-extrabold tracking-[0.1em] text-muted-foreground uppercase md:grid ${COLUMNS}`}
              >
                <span>Nombre</span>
                <span>Tipo</span>
                <span>Nombre científico</span>
                <span>Descripción</span>
                <span />
              </div>
              <ul
                aria-label="Plagas y enfermedades"
                className="divide-y divide-border"
              >
                {shown.map((item) => (
                  <li
                    className={`grid gap-x-4 gap-y-1 py-3 md:items-center md:px-1 md:py-2 ${COLUMNS}`}
                    key={item.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-selva">
                        {item.name}
                      </h2>
                      <StatusBadge tone={item.is_active ? 'ok' : 'warn'}>
                        {item.is_active ? 'Activa' : 'Inactiva'}
                      </StatusBadge>
                    </div>
                    <p className="text-sm font-semibold">
                      {PEST_DISEASE_KIND_LABELS[item.kind]}
                    </p>
                    <p className="text-sm">
                      {item.scientific_name ? (
                        <i>{item.scientific_name}</i>
                      ) : (
                        <span className="text-muted-foreground max-md:hidden">
                          —
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                    <div className="flex gap-2 max-md:mt-1 max-md:justify-end md:justify-end">
                      <PestFormDialog catalog={items} item={item} />
                      <PestStatusDialog item={item} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              description={
                items.length
                  ? 'Prueba con otro nombre o cambia el filtro de estado.'
                  : 'Registra la primera para que el capataz pueda elegirla en un monitoreo.'
              }
              title={
                items.length
                  ? 'Ninguna plaga o enfermedad coincide con la búsqueda'
                  : 'El catálogo está vacío'
              }
            />
          ))}
      </section>
    </div>
  );
}
