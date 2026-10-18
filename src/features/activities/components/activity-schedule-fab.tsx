import { Plus, ScanSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';

// Programar en un celular: un botón flotante abajo a la derecha, siempre al alcance del pulgar y
// sin gastar una fila del calendario. Sin conexión queda cerrado y lo dice, como el de escritorio.
export function ActivityScheduleFab({
  offline,
  onClick,
  onScheduleMonitoring,
}: {
  offline: boolean;
  onClick: () => void;
  // El monitoreo tiene su propio botón, más chico, sobre el principal.
  onScheduleMonitoring: () => void;
}) {
  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end gap-2">
      {offline && (
        <p
          className="max-w-56 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold shadow-card"
          id="schedule-needs-connection"
        >
          Programar una actividad necesita conexión.
        </p>
      )}
      <Button
        aria-describedby={offline ? 'schedule-needs-connection' : undefined}
        aria-label="Programar monitoreo"
        className="size-11 rounded-full shadow-card"
        disabled={offline}
        onClick={onScheduleMonitoring}
        variant="outline"
      >
        <ScanSearch aria-hidden="true" className="size-5" />
      </Button>
      <Button
        aria-describedby={offline ? 'schedule-needs-connection' : undefined}
        aria-label="Programar actividad"
        className="size-14 rounded-full shadow-card"
        disabled={offline}
        onClick={onClick}
      >
        <Plus aria-hidden="true" className="size-6" />
      </Button>
    </div>
  );
}
