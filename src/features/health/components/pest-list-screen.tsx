'use client';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FilterRow } from '@/components/filter-row';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Skeleton } from '@/components/ui/skeleton';

import { usePestDiseaseCatalog } from '../pest-api';
import { matchesPestFilters } from '../pest-filters';
import { usePestFilters } from '../use-pest-filters';
import { PestFormDialog } from './pest-form-dialog';
import { PestTable } from './pest-table';
import { pageContainerClass } from '@/components/page-container';

// Primero las plagas y luego las enfermedades: el tipo lo dice el título de cada grupo.
const PEST_GROUPS = [
  { kind: 'pest', label: 'Plagas' },
  { kind: 'disease', label: 'Enfermedades' },
] as const;

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
    <div className={pageContainerClass('wide')}>
      <PageHeader
        tone="claro"
        accent="cacao"
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
              placeholder="Buscar por nombre"
              type="search"
              value={search}
              wrapperClassName="min-w-0 flex-1 sm:min-w-72"
            />
          }
          trailing={
            catalog.isSuccess && (
              <p className="self-center text-sm font-bold text-muted-foreground max-sm:order-last max-sm:w-full sm:ml-auto">
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
            <div className="space-y-6">
              {PEST_GROUPS.map(({ kind, label }) => {
                const group = shown.filter((item) => item.kind === kind);
                if (group.length === 0) return null;
                return (
                  <section className="space-y-2" key={kind}>
                    <h2 className="section-label">
                      {label} · {group.length}
                    </h2>
                    <PestTable catalog={items} items={group} label={label} />
                  </section>
                );
              })}
            </div>
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
