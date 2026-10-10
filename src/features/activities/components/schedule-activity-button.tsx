import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

// Programar es solo en línea: sin conexión el botón lo dice en vez de fallar al guardar.
export function ScheduleActivityButton({
  offline,
  onClick,
}: {
  offline: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        aria-describedby={offline ? 'schedule-needs-connection' : undefined}
        disabled={offline}
        onClick={onClick}
        size="office"
      >
        <Plus aria-hidden="true" className="size-5" /> Programar actividad
      </Button>
      {offline && (
        <p
          className="text-sm text-muted-foreground"
          id="schedule-needs-connection"
        >
          Programar una actividad necesita conexión.
        </p>
      )}
    </div>
  );
}
