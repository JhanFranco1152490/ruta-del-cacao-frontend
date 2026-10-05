'use client';

import { Trash2 } from 'lucide-react';
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { DigitsField } from '@/components/digits-field';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';

import {
  type CharacterizationFormFields,
  type CharacterizationFormInput,
  UNAVAILABLE_VARIETY_MESSAGE,
} from '../schemas';
import type { VarietyChoice } from '../variety-choices';
import { PlantingMonthField } from './planting-month-field';

const KEPT_INACTIVE_HINT =
  'Variedad desactivada: ya no se ofrece para fichas nuevas. Puedes conservarla o cambiarla.';

// Una siembra de la ficha: la variedad, su mes y año, y cuántos árboles tiene.
export function PlantingLine({
  index,
  control,
  register,
  errors,
  choices,
  chosen,
  today,
  onRemove,
}: {
  index: number;
  control: Control<
    CharacterizationFormInput,
    unknown,
    CharacterizationFormFields
  >;
  register: UseFormRegister<CharacterizationFormInput>;
  errors: FieldErrors<CharacterizationFormInput>;
  choices: readonly VarietyChoice[];
  // La variedad elegida en esta fila, si hay.
  chosen?: VarietyChoice;
  today: Date;
  onRemove: () => void;
}) {
  const position = index + 1;
  const lineErrors = errors.plantings?.[index];

  return (
    <li className="grid gap-3 rounded-(--radius) border border-border p-3 sm:grid-cols-2 sm:items-start">
      <div className="sm:col-span-2">
        <SelectField
          className={CAPTURE_FIELD_CLASS}
          error={lineErrors?.variety_id?.message}
          hint={
            !chosen || chosen.isActive
              ? undefined
              : chosen.isAvailable
                ? KEPT_INACTIVE_HINT
                : UNAVAILABLE_VARIETY_MESSAGE
          }
          label={`Variedad ${position}`}
          {...register(`plantings.${index}.variety_id`)}
        >
          <option value="">Elige la variedad</option>
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </SelectField>
      </div>
      <Controller
        control={control}
        name={`plantings.${index}.planting_date`}
        render={({ field, fieldState }) => (
          <PlantingMonthField
            error={fieldState.error?.message}
            index={position}
            onBlur={field.onBlur}
            onChange={field.onChange}
            today={today}
            value={field.value}
          />
        )}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <DigitsField
          className={CAPTURE_FIELD_CLASS}
          control={control}
          label="Número de árboles"
          name={`plantings.${index}.tree_count`}
        />
        <Button
          aria-label={`Quitar siembra ${position}`}
          className="mt-7"
          onClick={onRemove}
          size="office"
          type="button"
          variant="outline"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          <span className="sr-only sm:not-sr-only">Quitar</span>
        </Button>
      </div>
    </li>
  );
}
