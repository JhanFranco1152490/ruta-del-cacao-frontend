'use client';

import { CalendarPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { MenuItem } from '@/components/ui/menu';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { notify } from '@/lib/notify';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { activitiesPath } from '../activity-paths';
import { onScheduleRequest, requestSchedule } from '../schedule-requests';
import { ActivityFormDialog } from './activity-form-dialog';
import { ACTIVITY_SCHEDULED_MESSAGE } from './use-activity-submit';

type PlotRef = {
  id: string;
  code: string;
  isActive: boolean;
  isSynced: boolean;
};
type FarmRef = { id: string; isActive: boolean };

// Si se puede programar una actividad en la parcela: con el permiso, en una parcela activa de una
// finca activa que ya está en el servidor (en las demás no se pueden programar labores).
function useCanSchedule(farm: FarmRef, plot: PlotRef) {
  const { data: user } = useSession();
  return (
    hasPermission(user, PERMISSIONS.ACTIVITIES_ADD) &&
    farm.isActive &&
    plot.isActive &&
    plot.isSynced
  );
}

// Programar una actividad desde una parcela: el formulario abre con su finca y esa parcela ya
// elegidas. Con `compact` (una tarjeta angosta) no dibuja el botón, que pasa a ser una opción del
// menú de la parcela (`SchedulePlotMenuItem`), pero sigue montado: el formulario es suyo.
export function SchedulePlotActivity({
  farm,
  plot,
  compact = false,
}: {
  farm: FarmRef;
  // `isSynced`: la parcela ya llegó al servidor (no está solo en el dispositivo).
  plot: PlotRef;
  compact?: boolean;
}) {
  const allowed = useCanSchedule(farm, plot);
  const hasConnection = useHasConnection();
  const helpId = useId();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const plotId = plot.id;

  useEffect(
    () =>
      onScheduleRequest((requested) => {
        if (requested === plotId) setOpen(true);
      }),
    [plotId],
  );

  if (!allowed) return null;

  return (
    <>
      {!compact && (
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
      )}
      {/* Sin conexión el botón se ve deshabilitado; el motivo lo oyen los lectores de pantalla. */}
      {!compact && !hasConnection && (
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

// La misma acción como opción del menú «⋯» de la parcela, para cuando la tarjeta es angosta. Abre el
// formulario de `SchedulePlotActivity`, que sigue montado en la tarjeta.
export function SchedulePlotMenuItem({
  farm,
  plot,
}: {
  farm: FarmRef;
  plot: PlotRef;
}) {
  const allowed = useCanSchedule(farm, plot);
  const hasConnection = useHasConnection();
  if (!allowed) return null;
  return (
    <MenuItem
      aria-label={`Programar actividad en ${plot.code}`}
      disabled={!hasConnection}
      onClick={() => requestSchedule(plot.id)}
    >
      <CalendarPlus aria-hidden="true" className="size-4" />
      {hasConnection ? 'Programar actividad' : 'Programar (necesita conexión)'}
    </MenuItem>
  );
}
