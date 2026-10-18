'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
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
import { useSession } from '@/hooks/use-session';
import { useFarmDetail } from '@/lib/api/farm-detail';
import { todayInBogota } from '@/lib/format/dates';
import {
  MISSING_FIELDS_MESSAGE,
  REQUIRED_FIELD_MESSAGE,
} from '@/lib/validation/messages';

import { type ActivityType, activityState } from '../activity-state';
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
// dónde se programa: la finca y la parcela (desde una parcela), la fecha (desde un día del
// calendario) o el tipo (desde Sanidad, un monitoreo). Se monta al abrirse: parte de los valores de ese momento y
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
  preset?: {
    farmId?: string;
    plotId?: string;
    date?: string;
    activityType?: ActivityType;
  };
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
          activity_type: preset?.activityType ?? '',
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
  const plotId = useWatch({ control: form.control, name: 'plot_id' });
  // La finca que se eligió en su campo acota las parcelas. No es lo mismo que la finca del
  // formulario: al elegir una parcela, esa finca se rellena sola y las demás parcelas deben seguir
  // a la vista.
  const [farmFilter, setFarmFilter] = useState(preset?.farmId ?? '');
  // La cuenta técnica puede acotar por productor al programar, salvo que el formulario venga de una
  // finca, que ya lo dice. Es opcional; para las demás cuentas no hay nada que elegir.
  const { data: user } = useSession();
  const needsProducer =
    user?.is_superuser === true && !activity && !preset?.farmId;
  const [chosenProducer, setChosenProducer] = useState<string>();
  const presetFarm = useFarmDetail(
    user?.id,
    user?.is_superuser === true && !activity ? (preset?.farmId ?? '') : '',
  );
  const producerId = chosenProducer ?? presetFarm.data?.data.producer.id;
  const choices = useActivityFormChoices(
    farmFilter,
    plotId,
    activity,
    producerId,
  );
  const fixedPlot = useMemo(
    () =>
      activity && {
        farm: activity.plot.farm.name,
        plot: activity.plot.code,
      },
    [activity],
  );

  const { setValue } = form;

  // Lo elegido bajo el productor anterior ya no vale.
  const changeProducer = (producer: string | undefined) => {
    setChosenProducer(producer);
    setFarmFilter('');
    setValue('farm_id', '');
    setValue('plot_id', '');
    setValue('assignee_id', '');
  };
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
            onFarmFilter={setFarmFilter}
            producer={
              needsProducer
                ? { value: chosenProducer, onChange: changeProducer }
                : undefined
            }
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
