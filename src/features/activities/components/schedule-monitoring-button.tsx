import { ScanSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';

// El monitoreo fitosanitario tiene su propio botón: no es una labor más, se cierra con una planilla
// de resultado. Abre el mismo formulario de programar con el tipo ya elegido. Como programar, solo
// en línea.
export function ScheduleMonitoringButton({
  offline,
  onClick,
}: {
  offline: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-describedby={offline ? 'schedule-needs-connection' : undefined}
      disabled={offline}
      onClick={onClick}
      size="office"
      variant="outline"
    >
      <ScanSearch aria-hidden="true" className="size-5" /> Programar{' '}
      <span className="sr-only sm:not-sr-only">monitoreo</span>
    </Button>
  );
}
