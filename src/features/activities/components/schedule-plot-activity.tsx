'use client';

import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { activitiesPath } from '../activity-paths';
import { ActivityFormDialog } from './activity-form-dialog';

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
  // El mes (yyyy-MM) de la actividad recién programada, para ofrecer ir a verla.
  const [scheduledMonth, setScheduledMonth] = useState<string>();

  if (
    !hasPermission(user, PERMISSIONS.ACTIVITIES_ADD) ||
    !farm.isActive ||
    !plot.isActive ||
    !plot.isSynced
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        aria-describedby={hasConnection ? undefined : helpId}
        aria-label={`Programar actividad en ${plot.code}`}
        disabled={!hasConnection}
        onClick={() => {
          setScheduledMonth(undefined);
          setOpen(true);
        }}
        size="office"
        variant="outline"
      >
        <CalendarPlus aria-hidden="true" className="size-4" /> Programar
        actividad
      </Button>
      {!hasConnection && (
        <p className="text-sm text-muted-foreground" id={helpId}>
          Programar una actividad necesita conexión.
        </p>
      )}
      {scheduledMonth && (
        <p className="text-sm font-bold text-ok" role="status">
          Actividad programada.{' '}
          <Link className="underline" href={activitiesPath(scheduledMonth)}>
            Ver en Actividades
          </Link>
        </p>
      )}
      {open && (
        <ActivityFormDialog
          onClose={() => setOpen(false)}
          onRejected={() => setOpen(false)}
          onSaved={(activity) => {
            setOpen(false);
            setScheduledMonth(activity.scheduled_date.slice(0, 7));
          }}
          preset={{ farmId: farm.id, plotId: plot.id }}
        />
      )}
    </div>
  );
}
