'use client';

import { cn } from 'cn';
import { useFormContext, useWatch } from 'react-hook-form';

import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';

import {
  type ControlMode,
  emptyControl,
  type MonitoringFormInput,
} from '../monitoring-form';
import type { MonitoringFormValues } from '../monitoring-schema';
import type { Recommendation } from '../recommendations';
import { useControlChoices } from '../control-choices';
import { DoneControlFields } from './done-control-fields';
import { ScheduledControlFields } from './scheduled-control-fields';

export const REQUESTED_CONTROL_NOTE =
  'El Productor o el Capataz de la finca lo van a programar.';

// Qué se hace con la detección. "Programarlo para después" es la misma opción para todos: quien
// puede programar elige fecha y responsable; quien no, pide que se lo programen.
export function DetectionControl({
  index,
  disabled,
  recommendation = null,
}: {
  index: number;
  disabled: boolean;
  // Lo que el catálogo recomienda para la plaga de esta detección.
  recommendation?: Recommendation | null;
}) {
  const { control, setValue } = useFormContext<
    MonitoringFormInput,
    unknown,
    MonitoringFormValues
  >();
  const { canSchedule } = useControlChoices();
  const path = `detections.${index}.control` as const;
  const current = useWatch({ control, name: path });
  const later: ControlMode = canSchedule ? 'scheduled' : 'requested';
  const options: readonly { mode: ControlMode; label: string }[] = [
    { mode: 'none', label: 'Ninguno por ahora' },
    { mode: 'done', label: 'Lo hice en este momento' },
    { mode: later, label: 'Programarlo para después' },
  ];

  // Cambiar de opción empieza en limpio: lo escrito para otra no se envía ni se valida.
  const choose = (mode: ControlMode) =>
    setValue(
      path,
      { ...emptyControl(current.id), mode },
      { shouldDirty: true },
    );

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-bold">Control</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map(({ mode, label }) => (
          <label
            className={cn(
              'flex min-h-15 cursor-pointer items-center gap-3 rounded-(--radius-field) border-[2.5px] px-3 text-base font-bold sm:min-h-14 sm:px-3',
              current.mode === mode
                ? 'border-selva bg-surface-alt text-selva'
                : 'border-ink',
            )}
            key={mode}
          >
            <input
              checked={current.mode === mode}
              className={cn('size-5 accent-(--selva)', FOCUS_OUTLINE_CLASS)}
              disabled={disabled}
              name={`detection-${index}-control`}
              onChange={() => choose(mode)}
              type="radio"
            />
            {label}
          </label>
        ))}
      </div>
      {current.mode === 'done' && (
        <DoneControlFields
          base={`${path}.`}
          disabled={disabled}
          recommendation={recommendation}
        />
      )}
      {current.mode === 'scheduled' && (
        <ScheduledControlFields
          base={`${path}.`}
          disabled={disabled}
          recommendation={recommendation}
        />
      )}
      {current.mode === 'requested' && (
        <p className="text-sm font-bold text-muted-foreground" role="status">
          {REQUESTED_CONTROL_NOTE}
        </p>
      )}
    </fieldset>
  );
}
