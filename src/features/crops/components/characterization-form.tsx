'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from '@/components/capture-field-class';
import { DigitsField } from '@/components/digits-field';
import { FormSection } from '@/components/form-section';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import { formatHectares } from '@/lib/format/hectares';

import {
  ageInMonths,
  coherenceWarnings,
  densityPerHectare,
  formatAge,
  formatCount,
  MANAGEMENT_SYSTEM_OPTIONS,
  SHADE_TYPE_OPTIONS,
  type Stage,
  STAGE_OPTIONS,
  totalTrees,
} from '../characterization-rules';
import {
  type CharacterizationFormFields,
  type CharacterizationFormInput,
  createCharacterizationFormSchema,
  MAX_VARIETY_LINES,
  UNAVAILABLE_VARIETY_MESSAGE,
} from '../schemas';
import { type VarietyOption, varietyChoices } from '../variety-choices';
import { CharacterizationWarnings } from './characterization-warnings';
import { PlantingMonthField } from './planting-month-field';

const EMPTY_LINE = { variety_id: '', tree_count: '' };

// Una ficha nueva arranca con una fila vacía: lo primero que se pide es la variedad.
export const emptyCharacterizationForm = (): CharacterizationFormInput => ({
  varieties: [{ ...EMPTY_LINE }],
  planting_date: '',
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
        new Set(defaultValues.varieties.map((line) => line.variety_id)),
      ),
    [catalog, keptVarietyIds, defaultValues.varieties],
  );
  // Por contenido y no por referencia: quien usa el formulario arma las listas en cada render, y
  // el esquema solo debe cambiar si cambia lo que se puede enviar.
  const unavailableKey = choices
    .filter((choice) => !choice.isAvailable)
    .map((choice) => choice.id)
    .join(',');
  const schema = useMemo(
    () =>
      createCharacterizationFormSchema(
        openedOn,
        new Set(unavailableKey.split(',').filter(Boolean)),
      ),
    [openedOn, unavailableKey],
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
    name: 'varieties',
  });
  const [lines, plantingDate, stage] = useWatch({
    control,
    name: ['varieties', 'planting_date', 'stage'],
  });

  const choiceById = new Map(choices.map((choice) => [choice.id, choice]));

  const trees = totalTrees(lines.map((line) => toTreeCount(line.tree_count)));
  const density = trees > 0 ? densityPerHectare(trees, areaHectares) : null;
  const ageMonths = ageInMonths(plantingDate, openedOn);
  const warnings = coherenceWarnings({
    density,
    stage: stage === '' ? null : (stage as Stage),
    ageMonths,
    varietyNames: lines
      .map((line) => choiceById.get(line.variety_id)?.name)
      .filter((name): name is string => !!name),
  });
  const varietiesError =
    errors.varieties?.root?.message ?? errors.varieties?.message;

  return (
    <form
      className="grid items-start gap-6 lg:grid-cols-2"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormSection title="Variedades sembradas">
        <ul aria-label="Variedades sembradas" className="space-y-4">
          {fields.map((field, index) => {
            const chosen = choiceById.get(lines[index]?.variety_id ?? '');
            return (
              <li
                className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] sm:items-start"
                key={field.id}
              >
                <SelectField
                  className={CAPTURE_FIELD_CLASS}
                  error={errors.varieties?.[index]?.variety_id?.message}
                  hint={
                    !chosen || chosen.isActive
                      ? undefined
                      : chosen.isAvailable
                        ? 'Variedad desactivada: ya no se ofrece para fichas nuevas. Puedes conservarla o cambiarla.'
                        : UNAVAILABLE_VARIETY_MESSAGE
                  }
                  label={`Variedad ${index + 1}`}
                  {...register(`varieties.${index}.variety_id`)}
                >
                  <option value="">Elige la variedad</option>
                  {choices.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.label}
                    </option>
                  ))}
                </SelectField>
                <DigitsField
                  className={CAPTURE_FIELD_CLASS}
                  control={control}
                  label="Número de árboles"
                  name={`varieties.${index}.tree_count`}
                />
                <Button
                  aria-label={`Quitar variedad ${index + 1}`}
                  className="sm:mt-7"
                  onClick={() => remove(index)}
                  size="office"
                  type="button"
                  variant="outline"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  <span className="sm:sr-only">Quitar</span>
                </Button>
              </li>
            );
          })}
        </ul>
        {varietiesError && (
          <p className="mt-3 text-sm font-bold text-err" role="alert">
            {varietiesError}
          </p>
        )}
        <Button
          className="mt-4"
          disabled={fields.length >= MAX_VARIETY_LINES}
          onClick={() => append({ ...EMPTY_LINE })}
          size="office"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-4" /> Agregar variedad
        </Button>
        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-(--radius) bg-muted px-4 py-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Total de árboles</dt>
            <dd className="text-lg font-bold">{formatCount(trees)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              Densidad (sobre {formatHectares(areaHectares)})
            </dt>
            <dd className="text-lg font-bold">
              {density === null ? '—' : `${formatCount(density)} árboles/ha`}
            </dd>
          </div>
        </dl>
      </FormSection>

      <FormSection title="Siembra y manejo">
        <div className="grid gap-5">
          <Controller
            control={control}
            name="planting_date"
            render={({ field, fieldState }) => (
              <PlantingMonthField
                error={fieldState.error?.message}
                hint={
                  ageMonths !== null && ageMonths >= 0
                    ? `Edad del cultivo: ${formatAge(ageMonths)}`
                    : 'Si hay árboles de varias edades, la de la siembra principal.'
                }
                onBlur={field.onBlur}
                onChange={field.onChange}
                today={openedOn}
                value={field.value}
              />
            )}
          />
          <SelectField
            className={CAPTURE_FIELD_CLASS}
            error={errors.stage?.message}
            label="Etapa del ciclo productivo"
            {...register('stage')}
          >
            <option value="">Elige la etapa</option>
            {STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            className={CAPTURE_FIELD_CLASS}
            error={errors.management_system?.message}
            label="Sistema de manejo (opcional)"
            {...register('management_system')}
          >
            <option value="">Sin especificar</option>
            {MANAGEMENT_SYSTEM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            className={CAPTURE_FIELD_CLASS}
            error={errors.shade_type?.message}
            label="Tipo de sombra (opcional)"
            {...register('shade_type')}
          >
            <option value="">Sin especificar</option>
            {SHADE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>
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
