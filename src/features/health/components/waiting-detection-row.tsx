'use client';

import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatDayMonth, formatShortDayMonth } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';

import { detectionName } from '../detection-status';
import { SAMPLING_UNITS } from '../monitoring-rules';
import type { WaitingDetection } from '../waiting-detections';
import { ControlFormDialog, type ControlOrigin } from './control-form-dialog';
import { NoControlNeededDialog } from './no-control-needed-dialog';

const originOfWaiting = (
  detection: WaitingDetection,
  producerId: string | null,
): ControlOrigin => ({
  // La lista no dice si la parcela o la finca están activas: si no lo están, el servidor lo dice
  // al recibir el control.
  plot: {
    id: detection.plot.id,
    code: detection.plot.code,
    is_active: true,
    farm: { ...detection.plot.farm, is_active: true },
  },
  producerId,
  monitoringDate: detection.monitoring.done_date,
});

// Una detección que espera un control: dónde, qué y cuánto, cuándo se encontró y quién pidió el
// control, con lo que se puede decidir sobre ella.
export function WaitingDetectionRow({
  detection,
  producer,
  onOpenMonitoring,
}: {
  detection: WaitingDetection;
  // El productor elegido por la cuenta técnica; nulo para las demás cuentas.
  producer: string | null;
  onOpenMonitoring?: () => void;
}) {
  const [scheduling, setScheduling] = useState(false);
  const unit = SAMPLING_UNITS[detection.sampling_unit].plural;
  const requester = detection.control_requested_by?.full_name;

  return (
    <li className="space-y-2 border-b border-border pb-3 last:border-b-0">
      <p className="font-bold">
        {detection.plot.code} · {detection.plot.farm.name}
      </p>
      <p>
        {detectionName(detection)} {formatDecimal(detection.incidence, 2)} % de{' '}
        {unit}
      </p>
      <p className="text-sm text-muted-foreground">
        Monitoreo del {formatDayMonth(detection.monitoring.done_date)} · Lo
        pidió {requester ?? 'una cuenta eliminada'} el{' '}
        {formatShortDayMonth(detection.control_requested_at)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          className="h-11"
          onClick={() => setScheduling(true)}
          type="button"
          variant="action"
        >
          <CalendarPlus aria-hidden="true" className="size-4" /> Programar
          control
        </Button>
        <NoControlNeededDialog detection={detection} />
        {onOpenMonitoring && (
          <Button
            className="h-11"
            onClick={onOpenMonitoring}
            type="button"
            variant="link"
          >
            Ver el monitoreo
          </Button>
        )}
      </div>
      {scheduling && (
        <ControlFormDialog
          detection={detection}
          mode="scheduled"
          onClose={() => setScheduling(false)}
          origin={originOfWaiting(detection, producer)}
        />
      )}
    </li>
  );
}
