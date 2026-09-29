import { useEffect } from 'react';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Pagination } from '@/components/pagination';
import { isApiError } from '@/lib/api/errors';
import { useAccounts, PAGE_SIZE } from '../api';
import type { useAccountFilters } from '../use-account-filters';
import { AccountTable } from './account-table';

export function AccountList({
  filters,
  open,
  municipalityName,
}: {
  filters: ReturnType<typeof useAccountFilters>;
  open: (id: string) => void;
  municipalityName?: (code: string) => string;
}) {
  const list = useAccounts(filters.query);
  const missingPage =
    isApiError(list.error) && list.error.status === 404 && filters.page > 1;
  const { setPage } = filters;
  useEffect(() => {
    if (missingPage) void setPage(1);
  }, [missingPage, setPage]);
  if (list.isPending || missingPage)
    return <p role="status">Cargando usuarios…</p>;
  if (list.isError)
    return (
      <ErrorState
        message={
          isApiError(list.error) && list.error.status === 403
            ? 'Acceso no disponible'
            : 'No fue posible cargar los usuarios.'
        }
        onRetry={() => {
          void list.refetch();
        }}
      />
    );
  return (
    <>
      <p role="status" className="text-sm text-muted-foreground">
        {list.data.count} usuarios encontrados
      </p>
      {list.data.results.length ? (
        <AccountTable
          accounts={list.data.results}
          open={open}
          municipalityName={municipalityName}
        />
      ) : (
        <EmptyState
          title="No hay usuarios para mostrar"
          description="Ajusta los filtros o crea una cuenta."
        />
      )}
      <Pagination
        page={filters.page}
        pageSize={PAGE_SIZE}
        total={list.data.count}
        label="usuarios"
        onPageChange={filters.setPage}
      />
    </>
  );
}
