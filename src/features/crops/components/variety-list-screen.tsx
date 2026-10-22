'use client';

import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FilterRow } from '@/components/filter-row';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { SelectField } from '@/components/select-field';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeCatalogName } from '@/lib/format/search';

import { type CacaoVariety, useCacaoVarietyCatalog } from '../api';
import { VarietyFormDialog } from './variety-form-dialog';
import { VarietyStatusDialog } from './variety-status-dialog';
import { pageContainerClass } from '@/components/page-container';

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
// Variedad, nombres comunes, procedencia, estado y acciones. En celular, el nombre y el estado arriba
// y lo demás debajo, a lo ancho.
const COLUMNS = 'md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1.3fr)_8rem_13rem]';

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
    <div className={pageContainerClass('wide')}>
      <PageHeader
        tone="claro"
        accent="hoja"
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
              placeholder="Buscar variedad"
              type="search"
              value={search}
              wrapperClassName="min-w-0 flex-1 sm:min-w-72"
            />
          }
          trailing={
            catalog.isSuccess && (
              <p className="self-center text-sm font-bold text-muted-foreground max-sm:order-last max-sm:w-full sm:ml-auto">
                {shown.length} variedades
              </p>
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
              <div>
                <div
                  aria-hidden="true"
                  className={`hidden h-10 items-center gap-x-4 bg-surface-alt px-2 text-sm font-bold text-selva md:grid ${COLUMNS}`}
                >
                  <span>Variedad</span>
                  <span>Nombres comunes</span>
                  <span>Procedencia</span>
                  <span className="pl-2">Estado</span>
                  <span />
                </div>
                <ul aria-label="Variedades" className="divide-y divide-border">
                  {pageItems.map((variety) => (
                    <li
                      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3 md:items-center md:px-2 ${COLUMNS}`}
                      key={variety.id}
                    >
                      <h2 className="text-lg font-bold text-selva max-md:order-1">
                        {variety.name}
                      </h2>
                      <p className="text-sm max-md:order-3 max-md:col-span-2">
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
                      <p className="text-sm text-muted-foreground max-md:order-4 max-md:col-span-2">
                        {variety.description}
                      </p>
                      <div className="justify-self-end max-md:order-2 max-md:self-start md:justify-self-start md:pl-2">
                        <StatusBadge tone={variety.is_active ? 'ok' : 'warn'}>
                          {variety.is_active ? 'Activa' : 'Inactiva'}
                        </StatusBadge>
                      </div>
                      <div className="flex justify-end gap-3 max-md:order-5 max-md:col-span-2 max-md:mt-1">
                        <VarietyFormDialog
                          catalog={varieties}
                          variety={variety}
                        />
                        <VarietyStatusDialog variety={variety} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
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
