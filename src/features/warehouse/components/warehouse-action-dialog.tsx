'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSession } from '@/hooks/use-session';
import { queryKeys } from '@/lib/api/query-keys';
import { notify } from '@/lib/notify';

import { type DialogRequest, requestOutcome } from '../dialog-request';
import { useLotStock } from '../queries';
import { warehousePermissionsOf } from '../warehouse-actions';
import { NO_CHANGES } from '../warehouse-form';
import { EntryDialog } from './entry-dialog';
import { ExitDialog } from './exit-dialog';
import { VoidExitDialog } from './void-exit-dialog';

export const LOT_UNAVAILABLE_MESSAGE =
  'Este lote ya no está disponible en Bodega.';

// El formulario pedido sobre un lote: lo lee con conexión y, si la acción todavía aplica, lo abre;
// si no, dice por qué y se cierra. Al guardar se avisa; si el lote cambió entretanto, se avisa por
// qué y Bodega se vuelve a leer.
export function WarehouseActionDialog({
  request,
  onClose,
}: {
  request: DialogRequest;
  onClose: () => void;
}) {
  const { data: user } = useSession();
  const can = warehousePermissionsOf(user);
  const queryClient = useQueryClient();
  const stock = useLotStock(request.lotId, true);
  const outcome = stock.data && requestOutcome(stock.data, request, can);
  // El aviso de por qué no se abre sale una sola vez, aunque el lote se vuelva a leer.
  const warned = useRef(false);

  useEffect(() => {
    if (warned.current) return;
    const message = stock.isError
      ? LOT_UNAVAILABLE_MESSAGE
      : outcome && !outcome.open
        ? outcome.message
        : null;
    if (!message) return;
    warned.current = true;
    notify.warning(message);
    onClose();
  }, [stock.isError, outcome, onClose]);

  if (!stock.data || !outcome?.open) return null;

  const saved = (message: string) => {
    if (message === NO_CHANGES) notify.info(message);
    else notify.success(message);
    onClose();
  };
  const statusChanged = (message: string) => {
    notify.warning(message);
    void queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.all() });
    onClose();
  };
  // Otra persona cambió el ingreso: se vuelve a leer y el formulario abre de nuevo con lo vigente.
  const stale = (message: string) => {
    notify.warning(message);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.warehouse.lot(request.lotId),
    });
  };

  switch (request.action) {
    case 'ingresar':
    case 'corregir':
      return (
        <EntryDialog
          canManage={can.manage}
          correcting={request.action === 'corregir'}
          // Con la versión leída: si cambia, el formulario se vuelve a armar con lo vigente.
          key={`${stock.data.lot.version}-${stock.data.entry?.version ?? 0}`}
          onClose={onClose}
          onSaved={saved}
          onStale={stale}
          onStatusChanged={statusChanged}
          stock={stock.data}
        />
      );
    case 'salida':
      return (
        <ExitDialog
          onClose={onClose}
          onSaved={saved}
          onStatusChanged={statusChanged}
          proposedGrade={request.grade}
          stock={stock.data}
        />
      );
    case 'anular': {
      // `requestOutcome` ya comprobó que la salida existe y se puede anular.
      const exit = stock.data.exits.find(({ id }) => id === request.exitId)!;
      return (
        <VoidExitDialog
          exit={exit}
          lotId={request.lotId}
          onClose={onClose}
          onSaved={saved}
          onStatusChanged={statusChanged}
        />
      );
    }
  }
}
