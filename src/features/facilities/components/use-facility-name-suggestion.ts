'use client';

import { useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import type { PostharvestFacility } from '../api';
import type { FacilityFormInput, FacilityFormValues } from '../facility-form';
import { suggestFacilityName } from '../facility-name';

// Al registrar, propone el nombre (C-01, M-01) según el tipo y la finca elegidos, y lo cambia si
// la persona cambia el tipo o la finca. En cuanto escribe uno propio, o lo borra, deja de tocarlo.
// Devuelve si el nombre que hay es todavía el propuesto, para decirlo junto al campo.
export function useFacilityNameSuggestion({
  form,
  known,
  enabled,
}: {
  form: UseFormReturn<FacilityFormInput, unknown, FacilityFormValues>;
  known: readonly PostharvestFacility[];
  enabled: boolean;
}) {
  const type = useWatch({ control: form.control, name: 'facility_type' });
  const farmId = useWatch({ control: form.control, name: 'farm_id' });
  const name = useWatch({ control: form.control, name: 'name' });
  const suggestion =
    enabled && type && farmId ? suggestFacilityName(known, farmId, type) : '';
  const applied = useRef('');

  const { getValues, setValue } = form;
  const { isSubmitted } = form.formState;
  useEffect(() => {
    if (!suggestion) return;
    const current = getValues('name');
    // Vacío solo antes de la primera propuesta: si la persona lo borró después, lo respeta.
    const untouched = current === applied.current;
    if (untouched && current !== suggestion) {
      setValue('name', suggestion, { shouldValidate: isSubmitted });
    }
    applied.current = suggestion;
  }, [suggestion, getValues, setValue, isSubmitted]);

  return suggestion !== '' && name === suggestion;
}
