'use client';

import { useEffect } from 'react';
import {
  type FieldErrors,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';

import { type ChoiceList, type FormChoice, listHint } from './activity-choices';
import { ActivityPlotFields } from './activity-plot-fields';
import { ActivityProducerField } from './activity-producer-field';

import {
  type ActivityFormInput,
  type ActivityFormValues,
  OTHER_DESCRIPTION_MAX_LENGTH,
} from '../schemas';

const options = (choices: readonly FormChoice[]) =>
  choices.map(({ id, label }) => (
    <option key={id} value={id}>
      {label}
    </option>
  ));

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
  onFarmFilter,
}: {
  form: UseFormReturn<ActivityFormInput, unknown, ActivityFormValues>;
  errors: FieldErrors<ActivityFormInput>;
  disabled: boolean;
  // La fecha de Bogotá: el selector no ofrece días anteriores.
  today: string;
  fixedPlot?: { farm: string; plot: string };
  farms: ChoiceList;
  // Las de la finca elegida o, sin ella, las de todas (hasta el tope de una página).
  plots: ChoiceList;
  types: readonly FormChoice[];
  assignees: ChoiceList;
  // Solo la cuenta técnica puede acotar por productor; es opcional: sin él se ve todo lo que alcanza.
  producer?: { value: string | undefined; onChange: (id?: string) => void };
  // Avisa de la finca que se eligió en su campo, para acotar las parcelas con ella.
  onFarmFilter: (farmId: string) => void;
}) {
  const { register, control, setValue, getValues } = form;
  const isOther = useWatch({ control, name: 'activity_type' }) === 'other';

  // El responsable de la actividad que se edita no se ve en su lista hasta que llegan las
  // opciones: al llegar, se vuelve a poner.
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
          <ActivityPlotFields
            disabled={disabled}
            errors={errors}
            farms={farms}
            form={form}
            hasProducer={!!producer}
            onFarmFilter={onFarmFilter}
            plots={plots}
          />
        </>
      )}
      <SelectField
        placeholder="Elige un tipo"
        disabled={disabled}
        error={errors.activity_type?.message}
        label="Tipo de actividad"
        {...register('activity_type')}
      >
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
        placeholder="Elige un responsable"
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
        {options(assignees.choices)}
      </SelectField>
    </div>
  );
}
