'use client';

import { useEffect } from 'react';
import {
  type FieldErrors,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { formatHectares } from '@/lib/format/hectares';

import { SCHEDULABLE_ACTIVITY_TYPE_OPTIONS } from '../activity-labels';
import {
  type ActivityFormInput,
  type ActivityFormValues,
  OTHER_DESCRIPTION_MAX_LENGTH,
} from '../schemas';

export type FormChoice = { id: string; label: string };

// Una lista que se llena con una lectura: mientras llega o si falla, el campo lo dice.
export type ChoiceList = {
  choices: readonly FormChoice[];
  isLoading: boolean;
  isError: boolean;
};

function listHint(
  list: ChoiceList,
  {
    loading,
    failed,
    empty,
  }: { loading: string; failed: string; empty: string },
) {
  if (list.isLoading) return loading;
  if (list.isError) return failed;
  return list.choices.length === 0 ? empty : undefined;
}

const options = (choices: readonly FormChoice[]) =>
  choices.map(({ id, label }) => (
    <option key={id} value={id}>
      {label}
    </option>
  ));

export const plotLabel = (plot: { code: string; areaHectares: string }) =>
  `${plot.code} · ${formatHectares(plot.areaHectares)}`;

// Los campos de programar una actividad. Las listas llegan ya filtradas: solo fincas y parcelas
// activas y cuentas activas.
export function ActivityFormFields({
  form,
  errors,
  disabled,
  today,
  farms,
  plots,
  assignees,
}: {
  form: UseFormReturn<ActivityFormInput, unknown, ActivityFormValues>;
  errors: FieldErrors<ActivityFormInput>;
  disabled: boolean;
  // La fecha de Bogotá: el selector no ofrece días anteriores.
  today: string;
  farms: ChoiceList;
  // Las de la finca elegida; sin finca, la lista está vacía y el campo deshabilitado.
  plots: ChoiceList;
  assignees: ChoiceList;
}) {
  const { register, control, setValue, getValues } = form;
  const farmId = useWatch({ control, name: 'farm_id' });
  const isOther = useWatch({ control, name: 'activity_type' }) === 'other';

  // Un valor que ya estaba elegido (la finca y la parcela desde las que se abrió el formulario)
  // no se ve en su lista hasta que llegan las opciones: al llegar, se vuelve a poner.
  useEffect(() => {
    setValue('farm_id', getValues('farm_id'));
  }, [farms.choices, getValues, setValue]);
  useEffect(() => {
    setValue('plot_id', getValues('plot_id'));
  }, [plots.choices, getValues, setValue]);
  useEffect(() => {
    setValue('assignee_id', getValues('assignee_id'));
  }, [assignees.choices, getValues, setValue]);

  return (
    <div className="space-y-4">
      <SelectField
        disabled={disabled}
        error={errors.farm_id?.message}
        hint={listHint(farms, {
          loading: 'Cargando fincas…',
          failed: 'No fue posible cargar las fincas.',
          empty: 'No hay fincas activas.',
        })}
        label="Finca"
        {...register('farm_id', {
          // La parcela elegida era de la otra finca.
          onChange: () => setValue('plot_id', ''),
        })}
      >
        <option value="">Elige una finca</option>
        {options(farms.choices)}
      </SelectField>
      <SelectField
        disabled={disabled || !farmId}
        error={errors.plot_id?.message}
        hint={
          farmId
            ? listHint(plots, {
                loading: 'Cargando parcelas…',
                failed: 'No fue posible cargar las parcelas.',
                empty: 'Esta finca no tiene parcelas activas.',
              })
            : 'Elige primero la finca.'
        }
        label="Parcela"
        {...register('plot_id')}
      >
        <option value="">Elige una parcela</option>
        {options(plots.choices)}
      </SelectField>
      <SelectField
        disabled={disabled}
        error={errors.activity_type?.message}
        label="Tipo de actividad"
        {...register('activity_type')}
      >
        <option value="">Elige un tipo</option>
        {SCHEDULABLE_ACTIVITY_TYPE_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      {isOther && (
        <TextField
          disabled={disabled}
          error={errors.other_description?.message}
          hint="De 2 a 80 caracteres, por ejemplo Mantenimiento de drenajes."
          label="¿Qué labor es?"
          maxLength={OTHER_DESCRIPTION_MAX_LENGTH}
          {...register('other_description')}
        />
      )}
      <TextField
        disabled={disabled}
        error={errors.scheduled_date?.message}
        label="Fecha programada"
        min={today}
        type="date"
        {...register('scheduled_date')}
      />
      <SelectField
        disabled={disabled}
        error={errors.assignee_id?.message}
        hint={listHint(assignees, {
          loading: 'Cargando responsables…',
          failed: 'No fue posible cargar los responsables.',
          empty: 'No hay cuentas activas para asignar.',
        })}
        label="Responsable"
        {...register('assignee_id')}
      >
        <option value="">Elige un responsable</option>
        {options(assignees.choices)}
      </SelectField>
    </div>
  );
}
