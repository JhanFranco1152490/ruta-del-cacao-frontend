'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { type FieldErrors, useForm } from 'react-hook-form';

import { DuplicateNotice } from '@/components/duplicate-notice';
import { FormDialog } from '@/components/form-dialog';
import { TextField } from '@/components/text-field';
import type { FarmOption } from '@/lib/api/farm-options';
import { agreeWith, FACILITY_TYPES } from '@/lib/facility-labels';
import {
  MISSING_FIELDS_MESSAGE,
  REQUIRED_FIELD_MESSAGE,
} from '@/lib/validation/messages';

import type { PostharvestFacility } from '../api';
import type { ExistingFacility } from '../facility-errors';
import {
  createFacilityFormSchema,
  FACILITY_NAME_MAX_LENGTH,
  facilityFormValuesOf,
  findDuplicateFacility,
  type FacilityFormInput,
  type FacilityFormValues,
  TYPE_LOCKED_HINT,
} from '../facility-form';
import { FacilityFarmField } from './facility-farm-field';
import { FacilityTypeField } from './facility-type-field';
import { useFacilityNameSuggestion } from '../use-facility-name-suggestion';
import { useFacilitySubmit } from '../use-facility-submit';

// Registrar un cajón o una marquesina, o editar `facility` si llega. Se monta al abrirse, así que
// parte de los valores de ese momento y no adopta lecturas posteriores: guardar la versión nueva
// con valores viejos pisaría lo que otra persona cambió.
export function FacilityFormDialog({
  facility,
  farms,
  farmId,
  known,
  onClose,
  onSaved,
  onShowExisting,
}: {
  facility?: PostharvestFacility;
  // Las fincas activas que la cuenta alcanza: donde se puede registrar.
  farms: readonly FarmOption[];
  // La finca de la lista: con ella empieza el formulario.
  farmId: string;
  // Todos los del productor, para avisar de un nombre repetido antes de enviar.
  known: readonly PostharvestFacility[];
  onClose: () => void;
  onSaved: (message: string | null) => void;
  onShowExisting: (id: string) => void;
}) {
  const farmName = useCallback(
    (id: string) =>
      farms.find((farm) => farm.id === id)?.name ??
      (facility?.farm.id === id ? facility.farm.name : ''),
    [farms, facility],
  );
  const schema = useMemo(
    () =>
      createFacilityFormSchema({ known, editingId: facility?.id, farmName }),
    [known, facility?.id, farmName],
  );
  const form = useForm<FacilityFormInput, unknown, FacilityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: facilityFormValuesOf(facility, farmId),
  });
  const { errors } = form.formState;
  const nameIsSuggested = useFacilityNameSuggestion({
    form,
    known,
    enabled: !facility,
  });
  const submission = useFacilitySubmit({ facility, form, farmName, onSaved });
  const { isSaving } = submission;

  const reportInvalid = (fieldErrors: FieldErrors<FacilityFormInput>) => {
    const missing = Object.values(fieldErrors).some(
      (error) => error?.message === REQUIRED_FIELD_MESSAGE,
    );
    submission.setSummary(missing ? MISSING_FIELDS_MESSAGE : undefined);
  };

  // El existente lo dice el servidor; si el aviso salió antes de enviar, se busca en la lista. Se
  // muestra mientras el nombre siga repetido: al corregirlo, el error del campo y el aviso se van.
  const repeated =
    errors.name?.type === 'server' || errors.name?.type === 'custom';
  const existing: ExistingFacility | undefined = !repeated
    ? undefined
    : errors.name?.type === 'server'
      ? submission.existing
      : findDuplicateFacility(
          known,
          form.getValues('name'),
          form.getValues('farm_id'),
          facility?.id,
        );
  const activateExisting = async (target: ExistingFacility) => {
    const found = known.find((candidate) => candidate.id === target.id);
    if (!found || (await submission.activate(found))) onShowExisting(target.id);
  };

  const type = facility && FACILITY_TYPES[facility.facility_type];
  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={
        facility
          ? 'El cambio no altera los procesos en los que ya se usó.'
          : 'Quedará Disponible para iniciar fermentaciones o secados, según su tipo.'
      }
      error={submission.summary}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={(event) => {
        void form.handleSubmit(submission.submit, reportInvalid)(event);
      }}
      submitLabel={facility ? 'Guardar cambios' : 'Guardar'}
      title={
        facility
          ? `Editar ${type?.noun} ${facility.name}`
          : 'Registrar elemento'
      }
    >
      <FacilityTypeField
        disabled={isSaving}
        error={errors.facility_type?.message}
        field={form.register('facility_type')}
        lockedHint={submission.typeLocked ? TYPE_LOCKED_HINT : undefined}
      />
      <TextField
        disabled={isSaving}
        error={errors.name?.message}
        hint={
          nameIsSuggested
            ? 'Nombre sugerido. Cámbialo si en la finca lo llaman distinto.'
            : 'Como lo identifican en la finca. Único en la finca.'
        }
        label="Nombre o código"
        maxLength={FACILITY_NAME_MAX_LENGTH}
        // Con el nombre sugerido seleccionado, escribir uno propio lo reemplaza.
        onFocus={(event) => {
          if (nameIsSuggested) event.target.select();
        }}
        placeholder="Ej.: C-04"
        {...form.register('name')}
      />
      {existing && (
        <DuplicateNotice
          active={existing.is_active}
          disabled={isSaving}
          inactiveText={`${existing.name} está ${agreeWith(existing.facility_type, 'inactiv')}.`}
          onActivate={() => void activateExisting(existing)}
          onShow={() => onShowExisting(existing.id)}
          showLabel="Ver el elemento"
        />
      )}
      <FacilityFarmField
        disabled={isSaving}
        error={errors.farm_id?.message}
        farms={farms}
        fixedFarm={facility?.farm}
        form={form}
      />
      <TextField
        disabled={isSaving}
        error={errors.capacity_kg?.message}
        inputMode="decimal"
        label="Capacidad (kg de cacao en baba)"
        placeholder="Ej.: 600"
        {...form.register('capacity_kg')}
      />
    </FormDialog>
  );
}
