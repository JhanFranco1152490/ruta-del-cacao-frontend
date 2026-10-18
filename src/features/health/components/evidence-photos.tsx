'use client';

import { Trash2 } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { useObjectUrl } from '@/hooks/use-object-url';
import { useSession } from '@/hooks/use-session';
import { getErrorMessage, isNetworkFailure } from '@/lib/api/errors';
import { notify } from '@/lib/notify';

import {
  type Evidence,
  useDeleteEvidence,
  useEvidenceFile,
} from '../evidence-api';
import { PhotoThumb } from './photo-thumb';

const DELETE_ACTION: StatusChangeAction = {
  trigger: 'Eliminar',
  title: '¿Eliminar esta foto?',
  description:
    'Es para una foto equivocada: deja de verse en el registro. Queda anotado quién la eliminó.',
  confirm: 'Eliminar foto',
  pending: 'Eliminando…',
  Icon: Trash2,
  variant: 'destructive',
};

function DeleteEvidenceDialog({
  evidence,
  activityId,
}: {
  evidence: Evidence;
  activityId: string;
}) {
  const remove = useDeleteEvidence(activityId);
  const dialog = useConfirmAction(
    async () => {
      await remove.mutateAsync(evidence.id);
      notify.success('Foto eliminada');
    },
    (error) =>
      isNetworkFailure(error)
        ? 'Eliminar una foto necesita conexión.'
        : getErrorMessage(error, 'No fue posible eliminar la foto.'),
  );
  return (
    <StatusChangeDialog
      action={DELETE_ACTION}
      trigger={DELETE_ACTION}
      {...dialog}
    />
  );
}

// Una foto que ya está en el servidor: se lee a través de la API, con su copia en el dispositivo.
export function ServerPhoto({
  evidence,
  activityId,
  index,
  canDelete,
  onOpen,
}: {
  evidence: Evidence;
  activityId: string;
  index: number;
  canDelete: boolean;
  onOpen: (url: string, label: string) => void;
}) {
  const { data: user } = useSession();
  const file = useEvidenceFile(user?.id, evidence.id);
  const url = useObjectUrl(file.data?.data);
  const label = `Foto ${index}`;
  return (
    <PhotoThumb
      action={
        canDelete && (
          <DeleteEvidenceDialog activityId={activityId} evidence={evidence} />
        )
      }
      label={label}
      onOpen={url ? () => onOpen(url, label) : undefined}
      unavailable={file.isError || (file.isPaused && !file.data)}
      url={url}
    />
  );
}

// Una foto que espera en el dispositivo: se ve desde su archivo, sin pedir nada.
export function QueuedPhoto({
  blob,
  index,
  onOpen,
}: {
  blob: Blob;
  index: number;
  onOpen: (url: string, label: string) => void;
}) {
  const url = useObjectUrl(blob);
  const label = `Foto ${index}`;
  return (
    <PhotoThumb
      label={label}
      onOpen={url ? () => onOpen(url, label) : undefined}
      pending
      url={url}
    />
  );
}
