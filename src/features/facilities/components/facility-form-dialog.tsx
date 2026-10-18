'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { type FieldErrors, useForm } from 'react-hook-form';

import { DuplicateNotice } from '@/components/duplicate-notice';
import { SubmitButton } from '@/components/submit-button';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useFacilitySubmit } from './use-facility-submit';

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
  const submission = useFacilitySubmit({ facility, form, farmName, onSaved });
  const { isSaving } = submission;

  const reportInvalid = (fieldErrors: FieldErrors<FacilityFormInput>) => {
    const missing = Object.values(fieldErrors).some(
      (error) => error?.message === REQUIRED_FIELD_MESSAGE,
    );
    submission.setSummary(missing ? MISSING_FIELDS_MESSAGE : undefined);
  };

  // El existente lo dice el servidor; si el aviso salió antes de enviar, se busca en la lista.
  const localDuplicate =
    errors.name?.type === 'custom'
      ? findDuplicateFacility(
          known,
          form.getValues('name'),
          form.getValues('farm_id'),
          facility?.id,
        )
      : undefined;
  const existing: ExistingFacility | undefined =
    submission.existing ?? localDuplicate;
  const activateExisting = async (target: ExistingFacility) => {
    const found = known.find((candidate) => candidate.id === target.id);
    if (!found || (await submission.activate(found))) onShowExisting(target.id);
  };

  const type = facility && FACILITY_TYPES[facility.facility_type];
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
      open
    >
      <DialogContent
        className="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
        showCloseButton={!isSaving}
      >
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            void form.handleSubmit(submission.submit, reportInvalid)(event);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {facility
                ? `Editar ${type?.noun} ${facility.name}`
                : 'Registrar elemento'}
            </DialogTitle>
            <DialogDescription>
              {facility
                ? 'El cambio no altera los procesos en los que ya se usó.'
                : 'Quedará Disponible para iniciar fermentaciones o secados, según su tipo.'}
            </DialogDescription>
          </DialogHeader>
          {submission.summary && (
            <p className="text-sm font-bold text-err" role="alert">
              {submission.summary}
            </p>
          )}
          <FacilityTypeField
            disabled={isSaving}
            error={errors.facility_type?.message}
            field={form.register('facility_type')}
            lockedHint={submission.typeLocked ? TYPE_LOCKED_HINT : undefined}
          />
          <TextField
            disabled={isSaving}
            error={errors.name?.message}
            hint="Como lo identifican en la finca. Único en la finca."
            label="Nombre o código"
            maxLength={FACILITY_NAME_MAX_LENGTH}
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
          <DialogFooter>
            <DialogClose
              disabled={isSaving}
              render={<Button variant="outline" />}
            >
              Cancelar
            </DialogClose>
            <SubmitButton
              className="sm:w-auto"
              pending={isSaving}
              pendingLabel="Guardando…"
            >
              {facility ? 'Guardar cambios' : 'Guardar'}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
