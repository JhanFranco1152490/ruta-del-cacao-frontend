'use client';

import { CalendarPlus } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { scheduleMonitoringPath } from '@/lib/paths/activities';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Programar un monitoreo no se hace aquí: el calendario de actividades es el único lugar donde se
// programa (responsable, fecha y alcance de la finca). El enlace lo abre con el tipo elegido y la
// finca y la parcela que se estén viendo, y al guardar o cancelar vuelve a esta pantalla. Lo ve
// quien puede programar, y con conexión: programar necesita al servidor.
export function ScheduleMonitoringLink({
  farm,
  plot,
  variant = 'default',
  className,
}: {
  farm: string | null;
  plot: string | null;
  variant?: 'default' | 'outline';
  className?: string;
}) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  if (!hasPermission(user, PERMISSIONS.ACTIVITIES_ADD) || !hasConnection) {
    return null;
  }
  return (
    <EditorLink
      className={buttonVariants({ size: 'office', variant, className })}
      href={scheduleMonitoringPath({ farm, plot })}
    >
      <CalendarPlus aria-hidden="true" className="size-5" /> Programar monitoreo
    </EditorLink>
  );
}
