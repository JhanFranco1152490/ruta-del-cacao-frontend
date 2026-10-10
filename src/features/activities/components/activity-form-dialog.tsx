'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { type FieldErrors, useForm, useWatch } from 'react-hook-form';

import { SubmitButton } from '@/components/submit-button';
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
import { todayInBogota } from '@/lib/format/dates';
import {
  MISSING_FIELDS_MESSAGE,
  REQUIRED_FIELD_MESSAGE,
} from '@/lib/validation/messages';

import { type AgriculturalActivity, useCreateActivity } from '../api';
import {
  type ActivityFormInput,
  type ActivityFormValues,
  createActivityFormSchema,
  EMPTY_ACTIVITY_FORM,
} from '../schemas';
import { ActivityFormFields } from './activity-form-fields';
import { useActivityFormChoices } from './use-activity-form-choices';
import { useActivitySubmit } from './use-activity-submit';

// Programar una actividad. `preset` trae la finca y la parcela cuando se abre desde una parcela.
// Se monta al abrirse: el id de la actividad nueva nace aquí, así que reenviar este mismo
// formulario no la programa dos veces.
export function ActivityFormDialog({
  preset,
  onClose,
  onSaved,
}: {
  preset?: { farmId: string; plotId: string };
  onClose: () => void;
  onSaved: (activity: AgriculturalActivity) => void;
}) {
  const [activityId] = useState(() => crypto.randomUUID());
  const today = todayInBogota();
  const schema = useMemo(() => createActivityFormSchema({ today }), [today]);
  const form = useForm<ActivityFormInput, unknown, ActivityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...EMPTY_ACTIVITY_FORM,
      farm_id: preset?.farmId ?? '',
      plot_id: preset?.plotId ?? '',
    },
  });
  const { errors } = form.formState;
  const farmId = useWatch({ control: form.control, name: 'farm_id' });
  const choices = useActivityFormChoices(farmId);

  // Con una sola finca activa no hay nada que elegir.
  const { setValue, getValues } = form;
  const farmChoices = choices.farms.choices;
  useEffect(() => {
    if (farmChoices.length === 1 && !getValues('farm_id')) {
      setValue('farm_id', farmChoices[0].id);
    }
  }, [farmChoices, getValues, setValue]);

  const create = useCreateActivity();
  const isSaving = create.isPending;
  const submission = useActivitySubmit({ form, activityId, create, onSaved });

  const reportInvalid = (fieldErrors: FieldErrors<ActivityFormInput>) => {
    const missing = Object.values(fieldErrors).some(
      (error) => error?.message === REQUIRED_FIELD_MESSAGE,
    );
    submission.setSummary(missing ? MISSING_FIELDS_MESSAGE : undefined);
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
      open
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!isSaving}>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            void form.handleSubmit(submission.submit, reportInvalid)(event);
          }}
        >
          <DialogHeader>
            <DialogTitle>Programar actividad</DialogTitle>
            <DialogDescription>
              Queda en el calendario como programada, a nombre de su
              responsable.
            </DialogDescription>
          </DialogHeader>
          {submission.summary && (
            <p className="text-sm font-bold text-err" role="alert">
              {submission.summary}
            </p>
          )}
          <ActivityFormFields
            {...choices}
            disabled={isSaving}
            errors={errors}
            form={form}
            today={today}
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
              Guardar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
