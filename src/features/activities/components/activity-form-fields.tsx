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

import { ActivityProducerField } from './activity-producer-field';

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

// Los campos de una actividad. Las listas llegan ya filtradas: solo fincas y parcelas activas y
// cuentas activas. Al editar llega `fixedPlot`: la actividad mantiene su parcela, así que la finca
// y la parcela se muestran pero no se cambian.
export function ActivityFormFields({
  form,
  errors,
  disabled,
  today,
  fixedPlot,
  farms,
  plots,
  types,
  assignees,
  producer,
}: {
  form: UseFormReturn<ActivityFormInput, unknown, ActivityFormValues>;
  errors: FieldErrors<ActivityFormInput>;
  disabled: boolean;
  // La fecha de Bogotá: el selector no ofrece días anteriores.
  today: string;
  fixedPlot?: { farm: string; plot: string };
  farms: ChoiceList;
  // Las de la finca elegida; sin finca, la lista está vacía y el campo deshabilitado.
  plots: ChoiceList;
  types: readonly FormChoice[];
  assignees: ChoiceList;
  // Solo la cuenta técnica elige el productor, antes que la finca; sin él, la finca espera.
  producer?: { value: string | undefined; onChange: (id?: string) => void };
}) {
  const { register, control, setValue, getValues } = form;
  const farmId = useWatch({ control, name: 'farm_id' });
  const isOther = useWatch({ control, name: 'activity_type' }) === 'other';

  // Un valor que ya estaba elegido (la parcela desde la que se abrió el formulario, el responsable
  // de la actividad que se edita) no se ve en su lista hasta que llegan las opciones: al llegar,
  // se vuelve a poner.
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
      {fixedPlot ? (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="mb-1 font-bold text-selva">Finca</dt>
            <dd>{fixedPlot.farm}</dd>
          </div>
          <div>
            <dt className="mb-1 font-bold text-selva">Parcela</dt>
            <dd>{fixedPlot.plot}</dd>
          </div>
        </dl>
      ) : (
        <>
          {producer && (
            <ActivityProducerField
              disabled={disabled}
              onChange={producer.onChange}
              value={producer.value}
            />
          )}
          <SelectField
            disabled={disabled || (!!producer && !producer.value)}
            error={errors.farm_id?.message}
            hint={
              producer && !producer.value
                ? 'Elige primero el productor.'
                : listHint(farms, {
                    loading: 'Cargando fincas…',
                    failed: 'No fue posible cargar las fincas.',
                    empty: 'No hay fincas activas.',
                  })
            }
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
        </>
      )}
      <SelectField
        disabled={disabled}
        error={errors.activity_type?.message}
        label="Tipo de actividad"
        {...register('activity_type')}
      >
        <option value="">Elige un tipo</option>
        {options(types)}
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
