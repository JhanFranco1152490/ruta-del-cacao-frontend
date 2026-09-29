'use client';
import { useEffect } from 'react';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { isApiError } from '@/lib/api/errors';
import { useRoles, PAGE_SIZE } from '../api';
import type { useRoleFilters } from '../use-role-filters';
import { RoleTable } from './role-table';

export function RoleList({
  filters,
  open,
}: {
  filters: ReturnType<typeof useRoleFilters>;
  open: (id: string) => void;
}) {
  const list = useRoles(filters.query);
  const missingPage =
    isApiError(list.error) && list.error.status === 404 && filters.page > 1;
  const { setPage } = filters;
  useEffect(() => {
    if (missingPage) void setPage(1);
  }, [missingPage, setPage]);
  if (list.isPending || missingPage)
    return <p role="status">Cargando roles…</p>;
  if (list.isError)
    return (
      <ErrorState
        message={
          isApiError(list.error) && list.error.status === 403
            ? 'Acceso no disponible'
            : 'No fue posible cargar los roles.'
        }
        onRetry={() => {
          void list.refetch();
        }}
      />
    );
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground" role="status">
        {list.data.count} roles encontrados
      </p>
      {list.data.results.length ? (
        <RoleTable roles={list.data.results} open={open} />
      ) : (
        <EmptyState
          title="No hay roles para mostrar"
          description="Ajusta los filtros o crea un rol propio."
        />
      )}
      <Pagination
        label="roles"
        page={filters.page}
        pageSize={PAGE_SIZE}
        total={list.data.count}
        onPageChange={filters.setPage}
      />
    </>
  );
}
