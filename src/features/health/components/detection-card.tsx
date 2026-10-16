'use client';

import { Trash2 } from 'lucide-react';
import { useId } from 'react';
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  useWatch,
} from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';

import type { MonitoringFormInput } from '../monitoring-form';
import {
  incidenceText,
  OTHER_PEST_DISEASE,
  SAMPLING_UNITS,
} from '../monitoring-rules';
import {
  OTHER_DESCRIPTION_MAX_LENGTH,
  type MonitoringFormValues,
} from '../monitoring-schema';
import type { PestDisease } from '../pest-api';
import { PestPicker } from './pest-picker';

// Una detección: qué se encontró y en cuántas unidades, con la incidencia mientras se escribe. El
// número va una vez, en el título, que nombra a sus campos para quien usa lector de pantalla.
export function DetectionCard({
  index,
  control,
  register,
  errors,
  pests,
  disabled,
  onRemove,
}: {
  index: number;
  control: Control<MonitoringFormInput, unknown, MonitoringFormValues>;
  register: UseFormRegister<MonitoringFormInput>;
  errors: FieldErrors<MonitoringFormInput>;
  pests: readonly PestDisease[] | undefined;
  disabled: boolean;
  onRemove: () => void;
}) {
  const titleId = useId();
  const number = index + 1;
  const [unit, evaluated, row] = useWatch({
    control,
    name: ['sampling_unit', 'evaluated_units', `detections.${index}`],
  });
  const rowErrors = errors.detections?.[index];
  const incidence = row && incidenceText(row.affected_units, evaluated, unit);

  return (
    <li
      aria-labelledby={titleId}
      className="space-y-4 rounded-(--radius-field) border-[2.5px] border-ink bg-card p-4"
      role="group"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className="font-sans text-base font-extrabold text-selva"
          id={titleId}
        >
          Detección {number}
        </h3>
        <Button
          aria-label={`Quitar detección ${number}`}
          disabled={disabled}
          onClick={onRemove}
          size="office"
          type="button"
          variant="outline"
        >
          <Trash2 aria-hidden="true" className="size-4" /> Quitar
        </Button>
      </div>
      <Controller
        control={control}
        name={`detections.${index}.pest_disease_id`}
        render={({ field }) => (
          <PestPicker
            disabled={disabled}
            error={rowErrors?.pest_disease_id?.message}
            onBlur={field.onBlur}
            onChange={field.onChange}
            pests={pests}
            value={field.value}
          />
        )}
      />
      {row?.pest_disease_id === OTHER_PEST_DISEASE && (
        <TextField
          className={CAPTURE_FIELD_CLASS}
          disabled={disabled}
          error={rowErrors?.other_description?.message}
          label="¿Qué encontraste?"
          maxLength={OTHER_DESCRIPTION_MAX_LENGTH}
          {...register(`detections.${index}.other_description`)}
        />
      )}
      <TextField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        error={rowErrors?.affected_units?.message}
        inputMode="numeric"
        label={SAMPLING_UNITS[unit].affected}
        {...register(`detections.${index}.affected_units`)}
      />
      <p aria-live="polite" className="text-base font-bold text-selva">
        {incidence ? `Incidencia: ${incidence}` : ''}
      </p>
    </li>
  );
}
