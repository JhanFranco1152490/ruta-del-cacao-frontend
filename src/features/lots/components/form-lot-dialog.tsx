'use client';

import { Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { StatusChangeDialog } from '@/components/status-change-dialog';
import { Button } from '@/components/ui/button';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { useCurrentPath } from '@/hooks/use-current-path';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { withOrigin } from '@/lib/navigation/origin';
import { notify } from '@/lib/notify';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { existingLotOf, useCreateLot } from '../api';
import { lotDetailPath } from '../lot-paths';
import { type LotSource, lotSourceSummary } from '../lot-source';

const CREATE_FAILED =
  'No fue posible conformar el lote. Revisa tu conexión e inténtalo nuevamente.';

const createErrorMessage = (error: unknown) =>
  isApiError(error) && error.status === 404
    ? 'Esta cosecha ya no existe.'
    : getErrorMessage(error, CREATE_FAILED);

// Conformar el lote de una cosecha: un resumen, la confirmación y la ficha del lote. Solo en línea;
// sin conexión el botón se deshabilita. En una fila de lista va `unavailable` en su lugar (el «Sin
// lote» de la columna) cuando no se puede conformar: la lista ya avisa que necesita conexión.
export function FormLotDialog({
  source,
  unavailable,
  returnTo,
}: {
  source: LotSource;
  unavailable?: ReactNode;
  // A dónde ofrece volver la ficha del lote; por omisión, la pantalla actual. Una pantalla que
  // solo existe tras guardar (la de «Cosecha registrada») da la lista a la que iba a volver.
  returnTo?: string;
}) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const router = useRouter();
  const create = useCreateLot();
  // La ficha del lote ofrece volver aquí: se conforma desde Cosechas y la ruta de arriba lleva a
  // Lotes.
  const current = useCurrentPath();
  const openLot = (id: string) =>
    router.push(withOrigin(lotDetailPath(id), returnTo ?? current));
  // Uno por diálogo: si la respuesta se pierde, reintentar devuelve el mismo lote.
  const [lotId] = useState(() => crypto.randomUUID());
  const dialog = useConfirmAction(async () => {
    try {
      const lot = await create.mutateAsync({
        id: lotId,
        harvest_id: source.harvestId,
      });
      notify.success('Lote conformado');
      openLot(lot.id);
    } catch (error) {
      // Otra persona lo conformó primero: se muestra ese lote en vez de un error.
      const existing = existingLotOf(error);
      if (!existing) throw error;
      notify.info(`Esta cosecha ya forma el lote ${existing.code}`);
      openLot(existing.id);
    }
  }, createErrorMessage);

  if (!hasPermission(user, PERMISSIONS.LOTS_ADD)) return unavailable ?? null;
  if (!hasConnection) {
    return unavailable !== undefined ? (
      unavailable
    ) : (
      <Button
        className="h-11"
        disabled
        size="office"
        title="Conformar un lote necesita conexión."
        variant="outline"
      >
        <Package aria-hidden="true" className="size-4" /> Conformar lote
        (necesita conexión)
      </Button>
    );
  }
  const action = {
    trigger: 'Conformar lote',
    title: '¿Conformar el lote?',
    description: lotSourceSummary(source),
    confirm: 'Conformar',
    pending: 'Conformando…',
    cancel: 'Volver',
    Icon: Package,
    variant: 'default' as const,
  };
  return (
    <StatusChangeDialog
      action={action}
      trigger={action}
      triggerSize="office"
      {...dialog}
    />
  );
}
