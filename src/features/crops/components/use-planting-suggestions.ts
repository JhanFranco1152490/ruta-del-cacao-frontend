import { useEffect, useState } from 'react';
import {
  type Control,
  type UseFormGetValues,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import {
  ageInMonths,
  isSeedVariety,
  suggestStage,
} from '../characterization-rules';
import type {
  CharacterizationFormFields,
  CharacterizationFormInput,
} from '../schemas';

type Params = {
  index: number;
  control: Control<
    CharacterizationFormInput,
    unknown,
    CharacterizationFormFields
  >;
  getValues: UseFormGetValues<CharacterizationFormInput>;
  setValue: UseFormSetValue<CharacterizationFormInput>;
  today: Date;
  // El nombre de la variedad elegida en esta fila, si hay.
  varietyName?: string;
  // Si la etapa tiene un error mostrado: al sugerirla se vuelve a validar para quitarlo.
  hasStageError: boolean;
};

// Propone la propagación según la variedad y la etapa según la edad de la siembra, mientras la
// persona no las haya tocado. Lo que ya trae la fila (una ficha guardada o pendiente) cuenta como
// tocado: abrirla para editar no cambia nada por sí solo. Se lleva por fila y no por posición, así
// quitar otra fila no desplaza lo que se recuerda.
export function usePlantingSuggestions({
  index,
  control,
  getValues,
  setValue,
  today,
  varietyName,
  hasStageError,
}: Params) {
  const stagePath = `plantings.${index}.stage` as const;
  const propagationPath = `plantings.${index}.propagation` as const;
  const line = useWatch({ control, name: `plantings.${index}` as const });

  const [fromData] = useState(() => getValues(stagePath) !== '');
  const [stageTouched, setStageTouched] = useState(fromData);
  const [propagationTouched, setPropagationTouched] = useState(fromData);

  const suggestion = suggestStage(
    ageInMonths(line?.planting_date ?? '', today),
    line?.propagation ?? 'grafted',
  );

  useEffect(() => {
    if (propagationTouched || !varietyName) return;
    const next = isSeedVariety(varietyName) ? 'seed' : 'grafted';
    if (getValues(propagationPath) !== next) setValue(propagationPath, next);
  }, [varietyName, propagationTouched, getValues, setValue, propagationPath]);

  useEffect(() => {
    if (stageTouched) return;
    const next = suggestion ?? '';
    if (getValues(stagePath) !== next) {
      setValue(stagePath, next, { shouldValidate: hasStageError });
    }
  }, [suggestion, stageTouched, hasStageError, getValues, setValue, stagePath]);

  return {
    // Se muestra "sugerida" solo mientras la etapa sea la que salió de la edad.
    stageSuggested:
      !stageTouched && suggestion !== null && line?.stage === suggestion,
    markStageTouched: () => setStageTouched(true),
    markPropagationTouched: () => setPropagationTouched(true),
  };
}
