'use client';

import { Power, PowerOff } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage } from '@/lib/api/errors';
import { notify } from '@/lib/notify';

import { type PestDisease, useUpdatePestDisease } from '../pest-api';
import { PEST_DISEASE_KIND_LABELS } from '../pest-filters';

const actionFor = (
  target: 'active' | 'inactive',
  item: PestDisease,
): StatusChangeAction => {
  // "plaga" o "enfermedad", para que el botón diga qué se desactiva.
  const kind = PEST_DISEASE_KIND_LABELS[item.kind].toLowerCase();
  return target === 'inactive'
    ? {
        trigger: 'Desactivar',
        title: `¿Desactivar ${item.name}?`,
        description:
          'Deja de ofrecerse en los monitoreos nuevos. Los monitoreos que ya la tienen no cambian, y puedes volver a activarla.',
        confirm: `Desactivar ${kind}`,
        pending: 'Desactivando…',
        Icon: PowerOff,
        variant: 'destructive',
      }
    : {
        trigger: 'Activar',
        title: `¿Activar ${item.name}?`,
        description:
          'Vuelve a ofrecerse en el buscador de la planilla del monitoreo.',
        confirm: `Activar ${kind}`,
        pending: 'Activando…',
        Icon: Power,
        variant: 'default',
      };
};

export function PestStatusDialog({ item }: { item: PestDisease }) {
  const update = useUpdatePestDisease();
  const target = item.is_active ? 'inactive' : 'active';
  const action = actionFor(target, item);
  const dialog = useConfirmAction(
    async () => {
      await update.mutateAsync({
        id: item.id,
        body: { is_active: target === 'active' },
      });
      notify.success(
        target === 'active'
          ? `${item.name} quedó activa`
          : `${item.name} quedó inactiva`,
      );
    },
    (error) =>
      getErrorMessage(
        error,
        'No fue posible cambiar el estado. Revisa tu conexión e inténtalo nuevamente.',
      ),
  );

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
