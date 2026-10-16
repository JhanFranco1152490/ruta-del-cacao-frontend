'use client';

import { useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { mayRecordFor } from '@/lib/activity-recorders';
import { isEmployee } from '@/lib/employee';
import type { components } from '@/lib/api/schema';
import { notify } from '@/lib/notify';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useEvidence } from '../evidence-api';
import { monitoringLabel } from '../monitoring-correction';
import { awaitingSend, selectPhotos } from '../photo-selection';
import { useQueuedEvidence, useSaveEvidence } from '../use-evidence-queue';
import { QueuedPhoto, ServerPhoto } from './evidence-photos';
import { PhotoPicker } from './photo-picker';
import { PhotoViewerDialog } from './photo-viewer-dialog';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// Las fotos que respaldan un monitoreo o un control realizados. Las adjunta quien puede registrar
// ese monitoreo o control, también días después y sin conexión; las elimina quien la subió, quien
// programa en la finca, el Productor o la cuenta técnica.
export function EvidenceSection({
  activity,
}: {
  activity: AgriculturalActivity;
}) {
  const { data: user } = useSession();
  const evidence = useEvidence(user?.id, activity.id);
  const queued = useQueuedEvidence(user?.id, activity.id);
  const save = useSaveEvidence();
  const [errors, setErrors] = useState<string[]>([]);
  const [viewing, setViewing] = useState<{ url: string; label: string }>();
  const canComplete = hasPermission(user, PERMISSIONS.ACTIVITIES_COMPLETE);
  const canAttach = canComplete && mayRecordFor(user, activity.assignee.id);
  // Un empleado que trabaja en todas las fincas pero no programa labores solo elimina las suyas.
  const canDeleteAny =
    canComplete &&
    (!isEmployee(user) || hasPermission(user, PERMISSIONS.ACTIVITIES_ADD));
  const saved = evidence.data?.data ?? [];
  const pending = awaitingSend(queued);
  const count = saved.length + pending.length;
  const kind = activity.monitoring ? 'monitoring' : 'control';
  const label =
    kind === 'monitoring'
      ? monitoringLabel(
          activity.plot.code,
          activity.done_date ?? activity.scheduled_date,
        )
      : `Control · ${activity.plot.code}`;

  const attach = async (files: File[]) => {
    const { photos, errors: rejected } = await selectPhotos(files, {
      already: count,
    });
    setErrors(rejected);
    if (photos.length === 0) return;
    save.mutate(
      photos.map((photo) => ({
        ...photo,
        activityId: activity.id,
        kind,
        label,
      })),
      {
        onSuccess: () =>
          notify.success(
            photos.length === 1 ? 'Foto adjuntada' : 'Fotos adjuntadas',
          ),
      },
    );
  };

  return (
    <section aria-label="Evidencia" className="space-y-3">
      <p className="section-label">Evidencia</p>
      {count === 0 && (
        <p className="text-sm text-muted-foreground">Sin fotos.</p>
      )}
      {count > 0 && (
        <ul aria-label="Fotos" className="flex flex-wrap gap-3">
          {saved.map((photo, index) => (
            <ServerPhoto
              activityId={activity.id}
              canDelete={canDeleteAny || photo.uploaded_by?.id === user?.id}
              evidence={photo}
              index={index + 1}
              key={photo.id}
              onOpen={(url, name) => setViewing({ url, label: name })}
            />
          ))}
          {pending.map((photo, index) => (
            <QueuedPhoto
              blob={photo.blob}
              index={saved.length + index + 1}
              key={photo.id}
              onOpen={(url, name) => setViewing({ url, label: name })}
            />
          ))}
        </ul>
      )}
      {canAttach && (
        <div className="space-y-2">
          <p className="text-sm font-bold">Adjuntar evidencia</p>
          <PhotoPicker
            buttonClassName="h-11"
            disabled={save.isPending}
            onFiles={(files) => void attach(files)}
          />
        </div>
      )}
      {errors.map((message) => (
        <p className="text-sm font-bold text-err" key={message} role="alert">
          {message}
        </p>
      ))}
      {viewing && (
        <PhotoViewerDialog
          label={viewing.label}
          onClose={() => setViewing(undefined)}
          url={viewing.url}
        />
      )}
    </section>
  );
}
