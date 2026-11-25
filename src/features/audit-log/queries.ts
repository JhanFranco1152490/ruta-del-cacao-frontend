import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { apiPath } from '@/lib/api/path';
import { type AuditLogFilters, queryKeys } from '@/lib/api/query-keys';

import type { AuditEntryPage, AuditOptions } from './api';
import { auditSearchParams } from './audit-request';

const OPTIONS_STALE_TIME = 5 * 60 * 1000;

// La bitácora no tiene copia en el dispositivo y se pide de nuevo cada vez que se entra: un cambio
// recién guardado tiene que estar. Al cambiar de página o de filtro sigue a la vista lo anterior
// mientras llega lo nuevo, salvo que sea de otro productor: sus cambios, aunque fuera un instante,
// se leerían como los de este.
export const useAuditLog = (filters: AuditLogFilters, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.auditLog.list(filters),
    queryFn: ({ signal }) =>
      apiFetch<AuditEntryPage>(
        apiPath('/api/audit-log', auditSearchParams(filters)),
        { signal },
      ),
    enabled,
    placeholderData: (previous, previousQuery) =>
      (previousQuery?.queryKey[2] as AuditLogFilters | undefined)?.producer ===
      filters.producer
        ? previous
        : undefined,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// Las cuentas y los tipos para los filtros cambian poco: no se piden en cada página.
export const useAuditOptions = (producer: string | null, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.auditLog.options(producer),
    queryFn: ({ signal }) =>
      apiFetch<AuditOptions>(apiPath('/api/audit-log/options', { producer }), {
        signal,
      }),
    enabled,
    staleTime: OPTIONS_STALE_TIME,
  });
