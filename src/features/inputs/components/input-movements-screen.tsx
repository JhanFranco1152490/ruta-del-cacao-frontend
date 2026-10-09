'use client';

import { ClipboardList, PackagePlus } from 'lucide-react';
import { useState } from 'react';

import { BackLink } from '@/components/back-link';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormMessage } from '@/components/form-message';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { formatLongDate } from '@/lib/format/dates';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import {
  useAgriculturalInputs,
  useInputMovements,
  useInputStocks,
} from '../api';
import { inputListPath } from '../input-paths';
import { formatStock, inputPackageOf } from '../stock-format';
import type { FarmChoice } from './input-farm-select';
import {
  InputMovementDialog,
  type MovementKind,
} from './input-movement-dialog';
import { InputMovementItem } from './input-movement-item';

// Los movimientos de un insumo en una finca, del más nuevo al más viejo. Es una consulta en línea,
// como el historial de las fichas: sin conexión lo dice en vez de quedarse cargando.
export function InputMovementsScreen({
  inputId,
  farm,
}: {
  inputId: string;
  farm: FarmChoice;
}) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const catalog = useAgriculturalInputs(user?.id, null);
  const stocks = useInputStocks(user?.id, farm.id);
  const movements = useInputMovements(inputId, farm.id);
  const [dialog, setDialog] = useState<MovementKind>();
  const [saved, setSaved] = useState<string>();
  const input = catalog.data?.data.find(
    (candidate) => candidate.id === inputId,
  );
  const backHref = inputListPath(farm.id);

  if (catalog.isSuccess && !input) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
        <BackLink href={backHref}>Volver a Insumos</BackLink>
        <ErrorState message="Este insumo ya no existe." />
      </div>
    );
  }

  const stock = stocks.data?.data.find((row) => row.input_id === inputId);
  const items = movements.data?.pages.flatMap((page) => page.results) ?? [];
  const canManage =
    hasPermission(user, PERMISSIONS.INPUTS_MANAGE_STOCK) && farm.is_active;
  const offline = !hasConnection || isPausedWithoutData(movements);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <BackLink href={backHref}>Volver a Insumos</BackLink>
      <PageHeader
        actions={
          input &&
          canManage && (
            <div className="flex flex-wrap gap-2">
              {input.is_active && (
                <Button
                  disabled={offline}
                  onClick={() => setDialog('entry')}
                  size="office"
                >
                  <PackagePlus aria-hidden="true" /> Registrar entrada
                </Button>
              )}
              <Button
                disabled={offline}
                onClick={() => setDialog('count')}
                size="office"
                variant="outline"
              >
                <ClipboardList aria-hidden="true" /> Registrar conteo
              </Button>
            </div>
          )
        }
        description={`En ${farm.name}`}
        eyebrow="Inventario"
        title={input ? `Movimientos de ${input.name}` : 'Movimientos'}
      />
      {input && stocks.isSuccess && (
        <dl className="mt-6 grid gap-3 rounded-lg bg-card p-4 shadow-card sm:grid-cols-2">
          <div>
            <dt className="text-sm font-bold text-muted-foreground">
              Existencias
            </dt>
            <dd className="text-lg font-bold text-selva">
              {formatStock(
                stock?.quantity ?? null,
                input.unit,
                inputPackageOf(input),
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-muted-foreground">
              Último conteo
            </dt>
            <dd className="text-lg">
              {stock?.last_count_date
                ? formatLongDate(stock.last_count_date)
                : 'Sin conteos'}
            </dd>
          </div>
        </dl>
      )}
      <div className="mt-6 empty:hidden">
        <FormMessage variant="success">{saved}</FormMessage>
      </div>
      <div className="mt-6">
        {offline ? (
          <EmptyState
            description="Los movimientos se consultan con conexión. Las existencias de la lista sí se ven sin conexión."
            title="Necesitas conexión para ver los movimientos"
          />
        ) : movements.isError ? (
          <ErrorState
            message="No fue posible cargar los movimientos. Revisa tu conexión e inténtalo nuevamente."
            onRetry={() => void movements.refetch()}
          />
        ) : movements.isPending || !input ? (
          <div
            aria-label="Cargando movimientos"
            className="space-y-4"
            role="status"
          >
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            description="Registra una entrada o un conteo para empezar a llevar sus existencias en esta finca."
            title="Este insumo aún no tiene movimientos en esta finca"
          />
        ) : (
          <>
            <ol aria-label="Movimientos" className="space-y-4">
              {items.map((movement) => (
                <InputMovementItem
                  key={movement.id}
                  movement={movement}
                  unit={input.unit}
                />
              ))}
            </ol>
            {movements.hasNextPage && (
              <Button
                className="mt-6"
                disabled={movements.isFetchingNextPage}
                onClick={() => void movements.fetchNextPage()}
                size="office"
                variant="outline"
              >
                {movements.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
              </Button>
            )}
          </>
        )}
      </div>
      {dialog && input && (
        <InputMovementDialog
          farm={farm.id}
          farms={[farm]}
          input={input}
          kind={dialog}
          onClose={() => setDialog(undefined)}
          onSaved={(message) => {
            setDialog(undefined);
            setSaved(message);
          }}
        />
      )}
    </div>
  );
}
