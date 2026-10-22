import type { ComponentProps, ReactNode } from 'react';

import { ActivityPeriodControl } from './activity-period-control';
import { ActivityStatePills } from './activity-state-pills';
import { ActivityViewSwitch } from './activity-view-switch';
import { ScheduleActivityButton } from './schedule-activity-button';
import { ScheduleMonitoringButton } from './schedule-monitoring-button';

// La fila de arriba: el cambio de vista y, en escritorio, los botones de programar (en celular
// programar va en el botón flotante).
export function CalendarViewRow({
  switcher,
  scheduling,
}: {
  switcher: ComponentProps<typeof ActivityViewSwitch>;
  // Sin él, no se ofrece programar aquí.
  scheduling?: {
    offline: boolean;
    onSchedule: () => void;
    onScheduleMonitoring: () => void;
  };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <ActivityViewSwitch {...switcher} />
      {scheduling && (
        <div className="flex flex-wrap items-start gap-2">
          <ScheduleMonitoringButton
            offline={scheduling.offline}
            onClick={scheduling.onScheduleMonitoring}
          />
          <ScheduleActivityButton
            offline={scheduling.offline}
            onClick={scheduling.onSchedule}
          />
        </div>
      )}
    </div>
  );
}

// Los recuentos por estado y el periodo, juntos y pegados al calendario.
export function CalendarPeriodRow({
  pills,
  period,
}: {
  // Sin ellos (cargando o sin actividades) solo queda el periodo.
  pills?: ComponentProps<typeof ActivityStatePills>;
  period: ComponentProps<typeof ActivityPeriodControl>;
}): ReactNode {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
      {pills && <ActivityStatePills {...pills} />}
      <div className="lg:ml-auto">
        <ActivityPeriodControl {...period} />
      </div>
    </div>
  );
}
