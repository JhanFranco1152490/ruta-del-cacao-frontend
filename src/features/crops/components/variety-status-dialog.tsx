'use client';

import { Power, PowerOff } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage } from '@/lib/api/errors';

import { type CacaoVariety, useUpdateCacaoVariety } from '../api';

const actionFor = (
  target: 'active' | 'inactive',
  name: string,
): StatusChangeAction =>
  target === 'inactive'
    ? {
        trigger: 'Desactivar',
        title: `¿Desactivar ${name}?`,
        description:
          'Deja de ofrecerse en las fichas nuevas. Las fichas que ya la tienen no cambian, y puedes volver a activarla.',
        confirm: 'Desactivar variedad',
        pending: 'Desactivando…',
        Icon: PowerOff,
        variant: 'destructive',
      }
    : {
        trigger: 'Activar',
        title: `¿Activar ${name}?`,
        description:
          'Vuelve a ofrecerse para que los productores la elijan en la ficha de sus parcelas.',
        confirm: 'Activar variedad',
        pending: 'Activando…',
        Icon: Power,
        variant: 'default',
      };

export function VarietyStatusDialog({ variety }: { variety: CacaoVariety }) {
  const update = useUpdateCacaoVariety();
  const target = variety.is_active ? 'inactive' : 'active';
  const action = actionFor(target, variety.name);
  const dialog = useConfirmAction(
    () =>
      update.mutateAsync({
        id: variety.id,
        body: { is_active: target === 'active' },
      }),
    (error) =>
      getErrorMessage(
        error,
        'No fue posible cambiar el estado de la variedad. Revisa tu conexión e inténtalo nuevamente.',
      ),
  );

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
