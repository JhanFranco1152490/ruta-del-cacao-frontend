'use client';

import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { Skeleton } from '@/components/ui/skeleton';

import { type CacaoVariety, useCacaoVarietyCatalog } from '../api';
import { normalizeVarietyName } from '../characterization-rules';
import { VarietyFormDialog } from './variety-form-dialog';
import { VarietyStatusDialog } from './variety-status-dialog';

type StatusFilter = '' | 'active' | 'inactive';

// La búsqueda compara como el servidor: "ccn 51" encuentra "CCN-51". También busca en la
// descripción, donde va la procedencia.
function matches(variety: CacaoVariety, search: string, status: StatusFilter) {
  if (status === 'active' && !variety.is_active) return false;
  if (status === 'inactive' && variety.is_active) return false;
  const needle = normalizeVarietyName(search);
  if (!needle) return true;
  return [variety.name, variety.description].some((text) =>
    normalizeVarietyName(text).includes(needle),
  );
}

// Catálogo común de la asociación: quien lo administra registra, edita, activa y desactiva. No se
// eliminan variedades aquí, porque las fichas de las parcelas las usan.
export function VarietyListScreen() {
  const catalog = useCacaoVarietyCatalog();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const varieties = catalog.data ?? [];
  const shown = varieties.filter((variety) => matches(variety, search, status));

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
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Buscar variedades"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre o procedencia"
            value={search}
          />
          <SelectField
            label="Filtrar por estado"
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            value={status}
          >
            <option value="">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </SelectField>
        </div>

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
            <ul aria-label="Variedades" className="divide-y divide-border">
              {shown.map((variety) => (
                <li
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={variety.id}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-selva">
                        {variety.name}
                      </h2>
                      <StatusBadge tone={variety.is_active ? 'ok' : 'warn'}>
                        {variety.is_active ? 'Activa' : 'Inactiva'}
                      </StatusBadge>
                    </div>
                    {variety.description && (
                      <p className="text-sm text-muted-foreground">
                        {variety.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <VarietyFormDialog catalog={varieties} variety={variety} />
                    <VarietyStatusDialog variety={variety} />
                  </div>
                </li>
              ))}
            </ul>
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
