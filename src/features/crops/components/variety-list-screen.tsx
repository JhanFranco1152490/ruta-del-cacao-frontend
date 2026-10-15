'use client';

import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FilterRow } from '@/components/filter-row';
import { PageHeader } from '@/components/page-header';
import { PageStepper, Pagination } from '@/components/pagination';
import { SelectField } from '@/components/select-field';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeCatalogName } from '@/lib/format/search';

import { type CacaoVariety, useCacaoVarietyCatalog } from '../api';
import { VarietyFormDialog } from './variety-form-dialog';
import { VarietyStatusDialog } from './variety-status-dialog';

const PAGE_SIZE = 20;

type StatusFilter = '' | 'active' | 'inactive';

// La búsqueda compara como el servidor: "ccn 51" encuentra "CCN-51". También busca en los
// nombres comunes ("saravena" encuentra los tres FSA) y en la descripción, donde va la procedencia.
function matches(variety: CacaoVariety, search: string, status: StatusFilter) {
  if (status === 'active' && !variety.is_active) return false;
  if (status === 'inactive' && variety.is_active) return false;
  const needle = normalizeCatalogName(search);
  if (!needle) return true;
  return [variety.name, ...variety.common_names, variety.description].some(
    (text) => normalizeCatalogName(text).includes(needle),
  );
}

// Catálogo común de la asociación: quien lo administra registra, edita, activa y desactiva. No se
// eliminan variedades aquí, porque las fichas de las parcelas las usan.
export function VarietyListScreen() {
  const catalog = useCacaoVarietyCatalog();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const varieties = catalog.data ?? [];
  const shown = varieties.filter((variety) => matches(variety, search, status));
  // Al cambiar la búsqueda o el filtro se vuelve a la primera página; una página que ya no existe
  // (se desactivó la última variedad de ella) cae en la última.
  const lastPage = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageItems = shown.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const changeStatus = (value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <PageHeader
        actions={
          catalog.isSuccess ? (
            <VarietyFormDialog catalog={varieties} />
          ) : undefined
        }
        description="El catálogo común del que los productores eligen las variedades sembradas en cada parcela."
        eyebrow="Administración"
        title="Variedades de cacao"
      />
      <section className="mt-8 space-y-5 rounded-lg bg-card p-5 shadow-card">
        <FilterRow
          activeCount={status ? 1 : 0}
          search={
            <TextField
              hideLabel
              label="Buscar variedades"
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Buscar variedad: nombre o procedencia"
              type="search"
              value={search}
              wrapperClassName="min-w-0 flex-1 sm:min-w-72"
            />
          }
          trailing={
            catalog.isSuccess && (
              <div className="flex items-center gap-4 self-center sm:ml-auto">
                <p className="text-sm font-bold text-muted-foreground">
                  {shown.length} variedades
                </p>
                <PageStepper
                  label="variedades"
                  onPageChange={setPage}
                  page={currentPage}
                  pageSize={PAGE_SIZE}
                  total={shown.length}
                />
              </div>
            )
          }
        >
          <SelectField
            hideLabel
            label="Filtrar por estado"
            onChange={(event) =>
              changeStatus(event.target.value as StatusFilter)
            }
            value={status}
            wrapperClassName="w-full sm:w-52"
          >
            <option value="">Todas las variedades</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </SelectField>
        </FilterRow>

        {catalog.isPending && (
          <div aria-label="Cargando variedades" role="status">
            <Skeleton className="h-64" />
          </div>
        )}
        {catalog.isError && (
          <ErrorState
            message="No fue posible cargar las variedades."
            onRetry={() => void catalog.refetch()}
          />
        )}
        {catalog.isSuccess &&
          (shown.length ? (
            <>
              <div
                aria-hidden="true"
                className="hidden gap-x-4 px-1 text-xs font-extrabold tracking-[0.1em] text-muted-foreground uppercase md:grid md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1.3fr)_13rem]"
              >
                <span>Variedad</span>
                <span>Nombres comunes</span>
                <span>Procedencia</span>
                <span />
              </div>
              <ul aria-label="Variedades" className="divide-y divide-border">
                {pageItems.map((variety) => (
                  <li
                    className="grid gap-x-4 gap-y-1 py-3 md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1.3fr)_13rem] md:items-center md:px-1 md:py-2"
                    key={variety.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-selva">
                        {variety.name}
                      </h2>
                      <StatusBadge tone={variety.is_active ? 'ok' : 'warn'}>
                        {variety.is_active ? 'Activa' : 'Inactiva'}
                      </StatusBadge>
                    </div>
                    <p className="text-sm">
                      {variety.common_names.length > 0 ? (
                        <>
                          <span className="text-muted-foreground md:hidden">
                            Nombres comunes:{' '}
                          </span>
                          {variety.common_names.join(', ')}
                        </>
                      ) : (
                        <span className="text-muted-foreground max-md:hidden">
                          —
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {variety.description}
                    </p>
                    <div className="flex gap-2 max-md:mt-1 max-md:justify-end md:justify-end">
                      <VarietyFormDialog
                        catalog={varieties}
                        variety={variety}
                      />
                      <VarietyStatusDialog variety={variety} />
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination
                label="variedades"
                onPageChange={setPage}
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={shown.length}
              />
            </>
          ) : (
            <EmptyState
              description={
                varieties.length
                  ? 'Prueba con otro nombre o cambia el filtro de estado.'
                  : 'Registra la primera variedad para que los productores puedan elegirla.'
              }
              title={
                varieties.length
                  ? 'Ninguna variedad coincide con la búsqueda'
                  : 'El catálogo está vacío'
              }
            />
          ))}
      </section>
    </div>
  );
}
