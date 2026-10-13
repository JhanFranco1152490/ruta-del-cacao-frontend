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

import { activityState } from '../activity-state';
import {
  type AgriculturalActivity,
  useCreateActivity,
  useUpdateActivity,
} from '../api';
import {
  type ActivityFormInput,
  type ActivityFormValues,
  createActivityFormSchema,
  EMPTY_ACTIVITY_FORM,
  toFormValues,
} from '../schemas';
import { ActivityFormFields } from './activity-form-fields';
import { useActivityFormChoices } from './use-activity-form-choices';
import { useActivitySubmit } from './use-activity-submit';

export const DELAYED_EDIT_NOTICE =
  'Esta actividad está retrasada: elige una fecha nueva o registra su realización.';

// Programar una actividad, o editar `activity` si llega. `preset` trae lo que ya se sabe de
// dónde se programa: la finca y la parcela (desde una parcela) o la fecha (desde un día del
// calendario). Se monta al abrirse: parte de los valores de ese momento y
// no adopta lecturas posteriores, porque guardar la versión nueva con valores viejos pisaría lo
// que otra persona cambió; y el id de la actividad nueva nace aquí, así que reenviar este mismo
// formulario no la programa dos veces.
export function ActivityFormDialog({
  activity,
  preset,
  onClose,
  onSaved,
  onRejected,
}: {
  activity?: AgriculturalActivity;
  preset?: { farmId?: string; plotId?: string; date?: string };
  onClose: () => void;
  onSaved: (activity: AgriculturalActivity, message: string) => void;
  onRejected: (message: string) => void;
}) {
  const [activityId] = useState(() => crypto.randomUUID());
  const today = todayInBogota();
  const create = useCreateActivity();
  const update = useUpdateActivity();
  const isSaving = create.isPending || update.isPending;
  // Lo vigente en el servidor: cambia cuando un `stale_version` trae una versión más nueva. La
  // fecha que no se valida al editar es la de esa versión.
  const [current, setCurrent] = useState(activity);
  const schema = useMemo(
    () => createActivityFormSchema({ today, original: current }),
    [today, current],
  );
  const form = useForm<ActivityFormInput, unknown, ActivityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: activity
      ? toFormValues(activity)
      : {
          ...EMPTY_ACTIVITY_FORM,
          farm_id: preset?.farmId ?? '',
          plot_id: preset?.plotId ?? '',
          scheduled_date: preset?.date ?? '',
        },
  });
  const submission = useActivitySubmit({
    form,
    activityId,
    current,
    onCurrent: setCurrent,
    create,
    update,
    onSaved,
    onUnchanged: onClose,
    onRejected,
  });
  const { errors } = form.formState;
  const farmId = useWatch({ control: form.control, name: 'farm_id' });
  const choices = useActivityFormChoices(farmId, activity);
  const fixedPlot = useMemo(
    () =>
      activity && {
        farm: activity.plot.farm.name,
        plot: activity.plot.code,
      },
    [activity],
  );

  // Con una sola finca activa no hay nada que elegir.
  const { setValue, getValues } = form;
  const farmChoices = choices.farms.choices;
  useEffect(() => {
    if (farmChoices.length === 1 && !getValues('farm_id')) {
      setValue('farm_id', farmChoices[0].id);
    }
  }, [farmChoices, getValues, setValue]);

  const reportInvalid = (fieldErrors: FieldErrors<ActivityFormInput>) => {
    const missing = Object.values(fieldErrors).some(
      (error) => error?.message === REQUIRED_FIELD_MESSAGE,
    );
    submission.setSummary(missing ? MISSING_FIELDS_MESSAGE : undefined);
  };
  const delayed =
    !!activity && activityState(activity, today).state === 'delayed';

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
            <DialogTitle>
              {activity ? 'Editar actividad' : 'Programar actividad'}
            </DialogTitle>
            <DialogDescription>
              {activity
                ? 'Puedes cambiar el tipo, la fecha o el responsable. La parcela no cambia.'
                : 'Queda en el calendario como programada, a nombre de su responsable.'}
            </DialogDescription>
          </DialogHeader>
          {delayed && !submission.summary && (
            <p
              className="rounded-md border border-warn/30 bg-warn-bg px-4 py-3 text-sm leading-6 font-bold text-warn"
              role="status"
            >
              {DELAYED_EDIT_NOTICE}
            </p>
          )}
          {submission.summary && (
            <p className="text-sm font-bold text-err" role="alert">
              {submission.summary}
            </p>
          )}
          <ActivityFormFields
            {...choices}
            disabled={isSaving}
            errors={errors}
            fixedPlot={fixedPlot}
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
              {activity ? 'Guardar cambios' : 'Guardar'}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
