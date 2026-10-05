'use client';

import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { DigitsField } from '@/components/digits-field';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';

import {
  PROPAGATION_OPTIONS,
  type Stage,
  STAGE_OPTIONS,
} from '../characterization-rules';
import {
  type CharacterizationFormFields,
  type CharacterizationFormInput,
  UNAVAILABLE_VARIETY_MESSAGE,
} from '../schemas';
import type { VarietyChoice } from '../variety-choices';
import { plantingLineSummary } from '../planting-line-summary';
import { PlantingMonthField } from './planting-month-field';
import { usePlantingSuggestions } from './use-planting-suggestions';

const KEPT_INACTIVE_HINT =
  'Variedad desactivada: ya no se ofrece para fichas nuevas. Puedes conservarla o cambiarla.';

const SUGGESTED_STAGE_HINT = 'Sugerida según la edad. Puedes cambiarla.';

// Una siembra de la ficha: la variedad, su mes y año, cuántos árboles tiene, cómo se propagó y en
// qué etapa está. Se puede colapsar para ver más siembras a la vez: sus campos siguen en el
// formulario y se envían igual, solo quedan ocultos.
export function PlantingLine({
  index,
  control,
  register,
  getValues,
  setValue,
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
  getValues: UseFormGetValues<CharacterizationFormInput>;
  setValue: UseFormSetValue<CharacterizationFormInput>;
  errors: FieldErrors<CharacterizationFormInput>;
  choices: readonly VarietyChoice[];
  // La variedad elegida en esta fila, si hay.
  chosen?: VarietyChoice;
  today: Date;
  onRemove: () => void;
}) {
  const position = index + 1;
  const lineErrors = errors.plantings?.[index];
  const { stageSuggested, markStageTouched, markPropagationTouched } =
    usePlantingSuggestions({
      index,
      control,
      getValues,
      setValue,
      today,
      varietyName: chosen?.name,
      hasStageError: !!lineErrors?.stage,
    });
  const propagation = register(`plantings.${index}.propagation`);
  const stage = register(`plantings.${index}.stage`);

  const contentId = useId();
  const [collapsed, setCollapsed] = useState(false);
  const line = useWatch({ control, name: `plantings.${index}` as const });
  // Un error en una siembra colapsada quedaría escondido: se abre para que se vea. Solo cuando el
  // error aparece, no mientras dura: si no, volvería a colapsarse sola al corregir el último.
  const hasErrors = !!lineErrors;
  const [hadErrors, setHadErrors] = useState(hasErrors);
  if (hasErrors !== hadErrors) {
    setHadErrors(hasErrors);
    if (hasErrors) setCollapsed(false);
  }

  return (
    <li className="space-y-3 rounded-(--radius) border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-selva">Siembra {position}</p>
          {collapsed && (
            <p className="text-sm break-words text-muted-foreground">
              {plantingLineSummary({
                variety: chosen?.label ?? '',
                month: line?.planting_date ?? '',
                trees: line?.tree_count ?? '',
                stage: (line?.stage ?? '') as Stage | '',
              })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            aria-controls={contentId}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expandir' : 'Colapsar'} siembra ${position}`}
            onClick={() => setCollapsed((value) => !value)}
            size="office"
            type="button"
            variant="outline"
          >
            {collapsed ? (
              <ChevronDown aria-hidden="true" className="size-4" />
            ) : (
              <ChevronUp aria-hidden="true" className="size-4" />
            )}
            <span className="sr-only sm:not-sr-only">
              {collapsed ? 'Expandir' : 'Colapsar'}
            </span>
          </Button>
          <Button
            aria-label={`Quitar siembra ${position}`}
            onClick={onRemove}
            size="office"
            type="button"
            variant="outline"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Quitar</span>
          </Button>
        </div>
      </div>
      <div
        className="grid gap-3 sm:grid-cols-2 sm:items-start"
        hidden={collapsed}
        id={contentId}
      >
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
        <DigitsField
          className={CAPTURE_FIELD_CLASS}
          control={control}
          label="Número de árboles"
          name={`plantings.${index}.tree_count`}
        />
        <SelectField
          className={CAPTURE_FIELD_CLASS}
          label={`Propagación ${position}`}
          {...propagation}
          onChange={(event) => {
            markPropagationTouched();
            return propagation.onChange(event);
          }}
        >
          {PROPAGATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          className={CAPTURE_FIELD_CLASS}
          error={lineErrors?.stage?.message}
          hint={stageSuggested ? SUGGESTED_STAGE_HINT : undefined}
          label={`Etapa ${position}`}
          {...stage}
          onChange={(event) => {
            markStageTouched();
            return stage.onChange(event);
          }}
        >
          <option value="">Elige la etapa</option>
          {STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>
    </li>
  );
}
