'use client';
import type { ReactNode } from 'react';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { isApiError } from '@/lib/api/errors';
import { useMissingPageReset } from '@/hooks/use-missing-page-reset';
import { ListViewToolbar } from '@/components/list-view-toolbar';
import { useGroupCollapse } from '@/hooks/use-group-collapse';
import { useRoles, PAGE_SIZE } from '../api';
import type { useRoleFilters } from '../use-role-filters';
import { RoleGroups, groupRoles } from './role-groups';
import { RoleTable } from './role-table';

export function RoleList({
  filters,
  open,
  byProducer,
  hint,
}: {
  filters: ReturnType<typeof useRoleFilters>;
  open: (id: string) => void;
  byProducer: boolean;
  hint?: ReactNode;
}) {
  const list = useRoles(filters.query);
  const groups = groupRoles(list.data?.results ?? [], byProducer);
  const collapse = useGroupCollapse(groups.map((group) => group.key));
  const missingPage = useMissingPageReset(
    list.error,
    filters.page,
    filters.setPage,
  );
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
      <ListViewToolbar
        count={`${list.data.count} roles encontrados`}
        hint={hint}
        view={filters.view}
        onViewChange={byProducer ? filters.setView : undefined}
        groups={collapse}
      />
      {list.data.results.length && filters.view === 'agrupada' ? (
        <RoleGroups groups={groups} collapse={collapse} open={open} />
      ) : list.data.results.length ? (
        <RoleTable
          roles={list.data.results}
          open={open}
          showProducer={byProducer}
        />
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
