'use client';

import {
  type FieldErrors,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { SearchSelect } from '@/components/search-select';

import { type ChoiceList, listHint } from './activity-choices';

import type { ActivityFormInput, ActivityFormValues } from '../schemas';

// La finca y la parcela de la actividad que se programa. Se puede empezar por cualquiera de las
// dos: la finca es un filtro (con «Todas las fincas» como entrada propia) que acota las parcelas, y
// elegir una parcela deja dicha su finca sin acotar la lista, para poder seguir viendo las demás.
export function ActivityPlotFields({
  form,
  errors,
  disabled,
  farms,
  plots,
  hasProducer,
  onFarmFilter,
}: {
  form: UseFormReturn<ActivityFormInput, unknown, ActivityFormValues>;
  errors: FieldErrors<ActivityFormInput>;
  disabled: boolean;
  farms: ChoiceList;
  plots: ChoiceList;
  // La cuenta técnica puede acotar las dos listas por productor: cambia lo que dice el aviso de tope.
  hasProducer: boolean;
  // Avisa de la finca que se eligió en su campo, para acotar las parcelas con ella.
  onFarmFilter: (farmId: string) => void;
}) {
  const { control, setValue, getValues } = form;
  const farmId = useWatch({ control, name: 'farm_id' });
  const plotId = useWatch({ control, name: 'plot_id' });
  // Tras un envío fallido, elegir vuelve a validar y quita el aviso del campo.
  const { isSubmitted } = form.formState;

  const plot = plots.choices.find(({ id }) => id === plotId);
  const farm =
    farms.choices.find(({ id }) => id === farmId) ??
    // La finca que dedujo una parcela puede no estar entre las primeras de la lista.
    (farmId ? { id: farmId, label: plot?.group ?? '' } : null);

  return (
    <>
      <SearchSelect
        allLabel="Todas las fincas"
        disabled={disabled}
        error={errors.farm_id?.message}
        hint={listHint(farms, {
          loading: 'Cargando fincas…',
          failed: 'No fue posible cargar las fincas.',
          empty: 'No hay fincas activas.',
          truncated: hasProducer
            ? 'Se muestran las primeras fincas. Elige un productor o escribe para ver las demás.'
            : 'Se muestran las primeras fincas. Escribe para ver las demás.',
        })}
        label="Finca"
        onChange={(option) => {
          const chosen = option?.id ?? '';
          setValue('farm_id', chosen);
          onFarmFilter(chosen);
          // La parcela elegida era de otra finca; con «Todas» se empieza de nuevo.
          const current = plots.choices.find(
            ({ id }) => id === getValues('plot_id'),
          );
          if (!chosen || (current && current.farmId !== chosen)) {
            setValue('plot_id', '');
          }
        }}
        options={farms.choices}
        value={farm}
      />
      <SearchSelect
        disabled={disabled}
        error={errors.plot_id?.message}
        hint={listHint(plots, {
          loading: 'Cargando parcelas…',
          failed: 'No fue posible cargar las parcelas.',
          empty: farmId
            ? 'Esta finca no tiene parcelas activas.'
            : 'No hay parcelas activas.',
          truncated:
            'Se muestran las primeras parcelas. Elige una finca o escribe para ver las demás.',
        })}
        label="Parcela"
        onChange={(option) => {
          setValue('plot_id', option?.id ?? '', {
            shouldValidate: isSubmitted,
          });
          // Elegir una parcela deja dicha su finca.
          const ofFarm = plots.choices.find(
            ({ id }) => id === option?.id,
          )?.farmId;
          if (ofFarm) setValue('farm_id', ofFarm);
        }}
        options={plots.choices}
        placeholder="Elige una parcela"
        value={plot ?? null}
      />
    </>
  );
}
