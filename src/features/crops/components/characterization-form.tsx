'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { Button } from '@/components/ui/button';

import {
  averageAgeInMonths,
  coherenceWarnings,
  densityPerHectare,
  type Stage,
  totalTrees,
} from '../characterization-rules';
import {
  type CharacterizationFormFields,
  type CharacterizationFormInput,
  createCharacterizationFormSchema,
  MAX_PLANTING_LINES,
} from '../schemas';
import { type VarietyOption, varietyChoices } from '../variety-choices';
import { CharacterizationTotals } from './characterization-totals';
import { CharacterizationWarnings } from './characterization-warnings';
import { PlantingLine } from './planting-line';
import { StageAndManagementFields } from './stage-and-management-fields';

const EMPTY_LINE = { variety_id: '', planting_date: '', tree_count: '' };

// Una ficha nueva arranca con una siembra vacía: lo primero que se pide es la variedad.
export const emptyCharacterizationForm = (): CharacterizationFormInput => ({
  plantings: [{ ...EMPTY_LINE }],
  stage: '',
  management_system: '',
  shade_type: '',
});

const NO_KEPT_VARIETIES: ReadonlySet<string> = new Set();

const toTreeCount = (text: string) =>
  /^\d+$/.test(text.trim()) ? Number(text) : Number.NaN;

export function CharacterizationForm({
  catalog,
  areaHectares,
  defaultValues,
  isSaving,
  error,
  blockedMessage,
  submitLabel = 'Guardar caracterización',
  secondaryAction,
  onSubmit,
  today,
  keptVarietyIds = NO_KEPT_VARIETIES,
}: {
  // Las variedades del catálogo que conoce el dispositivo.
  catalog: readonly VarietyOption[];
  // Las variedades de la ficha del servidor: una desactivada se puede conservar solo si ya
  // estaba ahí.
  keptVarietyIds?: ReadonlySet<string>;
  // El área declarada de la parcela, para la densidad.
  areaHectares: string;
  defaultValues: CharacterizationFormInput;
  isSaving: boolean;
  error?: string | null;
  // Si hay motivo, no se puede guardar: se explica junto al botón.
  blockedMessage?: string | null;
  submitLabel?: string;
  secondaryAction?: ReactNode;
  onSubmit: (fields: CharacterizationFormFields) => void;
  // Se recibe para probar la edad y la fecha sin depender del reloj.
  today?: Date;
}) {
  // El día se fija al abrir el formulario: no cambia mientras se llena.
  const [openedOn] = useState(() => today ?? new Date());
  // Las desactivadas solo se ofrecen en la ficha que ya las tenía; las que traen las filas del
  // dispositivo y ya no se aceptan se muestran marcadas para cambiarlas.
  const choices = useMemo(
    () =>
      varietyChoices(
        catalog,
        keptVarietyIds,
        new Set(defaultValues.plantings.map((line) => line.variety_id)),
      ),
    [catalog, keptVarietyIds, defaultValues.plantings],
  );
  // Por contenido y no por referencia: quien usa el formulario arma las listas en cada render, y
  // el esquema solo debe cambiar si cambia lo que se puede enviar.
  const unavailableKey = choices
    .filter((choice) => !choice.isAvailable)
    .map((choice) => choice.id)
    .join(',');
  const schema = useMemo(
    () =>
      createCharacterizationFormSchema(openedOn, {
        areaHectares,
        unavailableIds: new Set(unavailableKey.split(',').filter(Boolean)),
      }),
    [openedOn, areaHectares, unavailableKey],
  );
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CharacterizationFormInput, unknown, CharacterizationFormFields>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'plantings',
  });
  const [lines, stage] = useWatch({ control, name: ['plantings', 'stage'] });

  const choiceById = new Map(choices.map((choice) => [choice.id, choice]));

  const trees = totalTrees(lines.map((line) => toTreeCount(line.tree_count)));
  const density = trees > 0 ? densityPerHectare(trees, areaHectares) : null;
  const ageMonths = averageAgeInMonths(
    lines.map((line) => ({
      plantingMonth: line.planting_date,
      trees: toTreeCount(line.tree_count),
    })),
    openedOn,
  );
  const warnings = coherenceWarnings({
    density,
    stage: stage === '' ? null : (stage as Stage),
    ageMonths,
    varietyNames: lines
      .map((line) => choiceById.get(line.variety_id)?.name)
      .filter((name): name is string => !!name),
  });
  const plantingsError =
    errors.plantings?.root?.message ?? errors.plantings?.message;

  return (
    <form
      className="grid items-start gap-6 lg:grid-cols-2"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormSection title="Siembras">
        <ul aria-label="Siembras" className="space-y-4">
          {fields.map((field, index) => (
            <PlantingLine
              choices={choices}
              chosen={choiceById.get(lines[index]?.variety_id ?? '')}
              control={control}
              errors={errors}
              index={index}
              key={field.id}
              onRemove={() => remove(index)}
              register={register}
              today={openedOn}
            />
          ))}
        </ul>
        {plantingsError && (
          <p className="mt-3 text-sm font-bold text-err" role="alert">
            {plantingsError}
          </p>
        )}
        <Button
          className="mt-4"
          disabled={fields.length >= MAX_PLANTING_LINES}
          onClick={() => append({ ...EMPTY_LINE })}
          size="office"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-4" /> Agregar siembra
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          La misma variedad sembrada en otra fecha va en otra siembra.
        </p>
        <CharacterizationTotals
          ageMonths={ageMonths}
          areaHectares={areaHectares}
          density={density}
          trees={trees}
        />
      </FormSection>

      <FormSection title="Etapa y manejo">
        <StageAndManagementFields errors={errors} register={register} />
      </FormSection>

      <div className="space-y-4 lg:col-span-2">
        <CharacterizationWarnings warnings={warnings} />
        {error && (
          <p
            className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err"
            role="alert"
          >
            {error}
          </p>
        )}
        {blockedMessage && (
          <p className="font-bold text-warn" id="characterization-save-blocked">
            {blockedMessage}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            aria-describedby={
              blockedMessage ? 'characterization-save-blocked' : undefined
            }
            className={CAPTURE_BUTTON_CLASS}
            disabled={isSaving || !!blockedMessage}
            size="office"
            type="submit"
          >
            {isSaving ? 'Guardando…' : submitLabel}
          </Button>
          {secondaryAction}
        </div>
      </div>
    </form>
  );
}
