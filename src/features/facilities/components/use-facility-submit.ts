'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { applyApiFieldErrors } from '@/lib/api/form-errors';

import {
  type PostharvestFacility,
  useCreateFacility,
  useUpdateFacility,
} from '../api';
import {
  currentFacilityOf,
  duplicateFacilityOf,
  type ExistingFacility,
  FACILITY_ERROR,
} from '../facility-errors';
import {
  activatedMessage,
  duplicateMessage,
  FACILITY_SAVED_MESSAGE,
  FACILITY_UPDATED_MESSAGE,
  facilityFormValuesOf,
  FARM_INACTIVE_MESSAGE,
  type FacilityFormInput,
  type FacilityFormValues,
  STALE_FACILITY_MESSAGE,
  toCreateRequest,
  toUpdateRequest,
  TYPE_LOCKED_HINT,
} from '../facility-form';

const FIELDS = ['facility_type', 'name', 'farm_id', 'capacity_kg'] as const;

const SAVE_FAILED_MESSAGE =
  'No fue posible guardar el elemento. Revisa tu conexión e inténtalo nuevamente.';

// Envía el formulario de un elemento y traduce cada respuesta de error a lo que ve la persona. Ante
// cualquier error el formulario conserva lo escrito, salvo con una versión obsoleta: ahí carga los
// valores vigentes, porque guardar sobre ellos sin verlos pisaría el cambio de otra persona.
export function useFacilitySubmit({
  facility,
  form,
  farmName,
  onSaved,
}: {
  facility?: PostharvestFacility;
  form: UseFormReturn<FacilityFormInput, unknown, FacilityFormValues>;
  farmName: (farmId: string) => string;
  onSaved: (message: string | null) => void;
}) {
  const create = useCreateFacility();
  const update = useUpdateFacility();
  const [summary, setSummary] = useState<string>();
  const [existing, setExisting] = useState<ExistingFacility>();
  const [current, setCurrent] = useState(facility);
  const [typeLocked, setTypeLocked] = useState(
    !!facility && (facility.has_records || !!facility.occupied_by),
  );

  const showError = (error: unknown) => {
    const duplicate = duplicateFacilityOf(error);
    if (duplicate) {
      setExisting(duplicate);
      form.setError('name', {
        type: 'server',
        message: duplicateMessage(
          duplicate.name,
          farmName(form.getValues('farm_id')),
        ),
      });
      return;
    }
    const latest = currentFacilityOf(error);
    if (latest) {
      setCurrent(latest);
      setTypeLocked(latest.has_records || !!latest.occupied_by);
      form.reset(facilityFormValuesOf(latest, latest.farm.id));
      setSummary(STALE_FACILITY_MESSAGE);
      return;
    }
    if (
      isApiError(error) &&
      error.code === FACILITY_ERROR.fieldsLocked &&
      current
    ) {
      setTypeLocked(true);
      form.setValue('facility_type', current.facility_type);
      setSummary(TYPE_LOCKED_HINT);
      return;
    }
    if (isApiError(error) && error.code === FACILITY_ERROR.farmInactive) {
      form.setError('farm_id', {
        type: 'server',
        message: FARM_INACTIVE_MESSAGE,
      });
      return;
    }
    const { applied, unmatched } = applyApiFieldErrors(
      error,
      form.setError,
      FIELDS,
    );
    if (applied && unmatched.length === 0) return;
    setSummary(unmatched[0] ?? getErrorMessage(error, SAVE_FAILED_MESSAGE));
  };

  const submit = async (values: FacilityFormValues) => {
    setSummary(undefined);
    setExisting(undefined);
    try {
      if (current) {
        const changes = toUpdateRequest(values, current);
        // Sin cambios no hay nada que guardar ni que avisar.
        if (!changes) return onSaved(null);
        await update.mutateAsync({
          id: current.id,
          body: { ...changes, expected_version: current.version },
        });
        onSaved(FACILITY_UPDATED_MESSAGE);
      } else {
        await create.mutateAsync(toCreateRequest(values));
        onSaved(FACILITY_SAVED_MESSAGE);
      }
    } catch (error) {
      showError(error);
    }
  };

  // Activa el elemento inactivo que tiene el nombre repetido. Devuelve si lo logró. El aviso nombra
  // al elemento como lo devuelve el servidor: la copia del dispositivo puede estar atrasada.
  const activate = async (known: PostharvestFacility) => {
    setSummary(undefined);
    try {
      const activated = await update.mutateAsync({
        id: known.id,
        body: { is_active: true, expected_version: known.version },
      });
      onSaved(activatedMessage(activated));
      return true;
    } catch (error) {
      setSummary(getErrorMessage(error, 'No fue posible activar el elemento.'));
      return false;
    }
  };

  return {
    submit,
    activate,
    summary,
    setSummary,
    existing,
    typeLocked,
    isSaving: create.isPending || update.isPending,
  };
}
