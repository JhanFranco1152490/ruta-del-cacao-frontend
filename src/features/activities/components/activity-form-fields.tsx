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

// Una opción de un select. `group` agrupa las que se muestran bajo un mismo encabezado (las
// parcelas de una finca) y `farmId` dice a qué finca pertenece la opción elegida.
export type FormChoice = {
  id: string;
  label: string;
  group?: string;
  farmId?: string;
};

// Una lista que se llena con una lectura: mientras llega o si falla, el campo lo dice.
export type ChoiceList = {
  choices: readonly FormChoice[];
  isLoading: boolean;
  isError: boolean;
  // La lista no cabe en una página: se ofrecen las primeras y el resto se alcanza acotándola.
  truncated?: boolean;
};

function listHint(
  list: ChoiceList,
  {
    loading,
    failed,
    empty,
    truncated,
  }: { loading: string; failed: string; empty: string; truncated?: string },
) {
  if (list.isLoading) return loading;
  if (list.isError) return failed;
  if (list.choices.length === 0) return empty;
  return list.truncated ? truncated : undefined;
}

const option = ({ id, label }: FormChoice) => (
  <option key={id} value={id}>
    {label}
  </option>
);

// Las opciones con `group` se muestran bajo su encabezado, en el orden en que llegan.
const options = (choices: readonly FormChoice[]) => {
  if (!choices.some(({ group }) => group)) return choices.map(option);
  const groups = new Map<string, FormChoice[]>();
  for (const choice of choices) {
    const key = choice.group ?? '';
    groups.set(key, [...(groups.get(key) ?? []), choice]);
  }
  return [...groups].map(([group, items]) => (
    <optgroup key={group} label={group}>
      {items.map(option)}
    </optgroup>
  ));
};

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
            disabled={disabled}
            error={errors.farm_id?.message}
            hint={listHint(farms, {
              loading: 'Cargando fincas…',
              failed: 'No fue posible cargar las fincas.',
              empty: 'No hay fincas activas.',
              truncated: producer
                ? 'Se muestran las primeras fincas. Elige un productor para ver las demás.'
                : 'Se muestran las primeras fincas.',
            })}
            label="Finca"
            {...register('farm_id', {
              onChange: (event) => {
                const chosen: string = event.target.value;
                onFarmFilter(chosen);
                // La parcela elegida era de otra finca; con «Todas» se empieza de nuevo.
                const plot = plots.choices.find(
                  ({ id }) => id === getValues('plot_id'),
                );
                if (!chosen || (plot && plot.farmId !== chosen)) {
                  setValue('plot_id', '');
                }
              },
            })}
          >
            <option value="">Todas las fincas</option>
            {options(farms.choices)}
          </SelectField>
          <SelectField
            placeholder="Elige una parcela"
            disabled={disabled}
            error={errors.plot_id?.message}
            hint={listHint(plots, {
              loading: 'Cargando parcelas…',
              failed: 'No fue posible cargar las parcelas.',
              empty: farmId
                ? 'Esta finca no tiene parcelas activas.'
                : 'No hay parcelas activas.',
              truncated:
                'Se muestran las primeras parcelas. Elige una finca para ver las demás.',
            })}
            label="Parcela"
            {...register('plot_id', {
              // Elegir una parcela deja dicha su finca.
              onChange: (event) => {
                const farm = plots.choices.find(
                  ({ id }) => id === event.target.value,
                )?.farmId;
                if (farm) setValue('farm_id', farm);
              },
            })}
          >
            {options(plots.choices)}
          </SelectField>
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
