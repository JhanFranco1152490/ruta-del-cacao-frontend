'use client';

import { CircleSlash } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage } from '@/lib/api/errors';
import { notify } from '@/lib/notify';

import { type Detection, detectionName } from '../detection-status';
import { useNoControlNeeded } from '../use-control-actions';

// Quien programa decide que una detección que alguien pidió atender no necesita control. Sale del
// aviso de detecciones que esperan un control y queda registrado quién lo decidió.
export function NoControlNeededDialog({ detection }: { detection: Detection }) {
  const decide = useNoControlNeeded();
  const action: StatusChangeAction = {
    trigger: 'No requiere control',
    title: `¿${detectionName(detection)} no requiere control?`,
    description:
      'Sale del aviso de detecciones que esperan un control y queda registrado que lo decidiste tú. Si después hace falta, puedes programarle un control.',
    confirm: 'Confirmar',
    pending: 'Guardando…',
    Icon: CircleSlash,
    variant: 'default',
  };
  const dialog = useConfirmAction(
    async () => {
      await decide.mutateAsync(detection.id);
      notify.success('Detección marcada: no requiere control');
    },
    (error) =>
      getErrorMessage(
        error,
        'No fue posible guardar la decisión. Revisa tu conexión e inténtalo nuevamente.',
      ),
  );

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
