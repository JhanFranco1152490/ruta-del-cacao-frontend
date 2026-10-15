'use client';

import { CalendarPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { notify } from '@/lib/notify';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { activitiesPath } from '../activity-paths';
import { ActivityFormDialog } from './activity-form-dialog';
import { ACTIVITY_SCHEDULED_MESSAGE } from './use-activity-submit';

// Programar una actividad desde una parcela: el formulario abre con su finca y esa parcela ya
// elegidas. Solo se ofrece en una parcela activa de una finca activa que ya está en el servidor,
// porque en las demás no se pueden programar labores.
export function SchedulePlotActivity({
  farm,
  plot,
}: {
  farm: { id: string; isActive: boolean };
  // `isSynced`: la parcela ya llegó al servidor (no está solo en el dispositivo).
  plot: { id: string; code: string; isActive: boolean; isSynced: boolean };
}) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const helpId = useId();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (
    !hasPermission(user, PERMISSIONS.ACTIVITIES_ADD) ||
    !farm.isActive ||
    !plot.isActive ||
    !plot.isSynced
  ) {
    return null;
  }

  return (
    <>
      <Button
        aria-describedby={hasConnection ? undefined : helpId}
        aria-label={`Programar actividad en ${plot.code}`}
        disabled={!hasConnection}
        onClick={() => {
          setOpen(true);
        }}
        className="size-10 px-0"
        size="office"
        title="Programar actividad"
        variant="action"
      >
        <CalendarPlus aria-hidden="true" className="size-4" />
      </Button>
      {/* Sin conexión el botón se ve deshabilitado; el motivo lo oyen los lectores de pantalla. */}
      {!hasConnection && (
        <span className="sr-only" id={helpId}>
          Programar una actividad necesita conexión.
        </span>
      )}
      {open && (
        <ActivityFormDialog
          onClose={() => setOpen(false)}
          onRejected={() => setOpen(false)}
          onSaved={(activity) => {
            setOpen(false);
            // El aviso ofrece ir a verla en el mes en que quedó.
            notify.success(ACTIVITY_SCHEDULED_MESSAGE, {
              action: {
                label: 'Ver en Actividades',
                onClick: () =>
                  router.push(
                    activitiesPath(activity.scheduled_date.slice(0, 7)),
                  ),
              },
            });
          }}
          preset={{ farmId: farm.id, plotId: plot.id }}
        />
      )}
    </>
  );
}
