'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { type FieldErrors, useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { todayInBogota } from '@/lib/format/dates';
import {
  MISSING_FIELDS_MESSAGE,
  REQUIRED_FIELD_MESSAGE,
} from '@/lib/validation/messages';

import {
  type ActivityPreset,
  activityFormDefaults,
  activityFormTexts,
} from '../activity-form-setup';
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
} from '../schemas';
import { ActivityFormFields } from './activity-form-fields';
import { useActivityFormChoices } from '../use-activity-form-choices';
import { useActivityProducerChoice } from '../use-activity-producer-choice';
import { useActivitySubmit } from '../use-activity-submit';

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
  preset?: ActivityPreset;
  onClose: () => void;
  onSaved: (activity: AgriculturalActivity, message: string) => void;
  onRejected: (message: string) => void;
}) {
  const [activityId] = useState(() => crypto.randomUUID());
  // Desde Sanidad el tipo ya está decidido: es un monitoreo, y el diálogo no lo pregunta para que
  // no se confunda con programar una labor.
  const monitoring =
    !activity && preset?.activityType === 'phytosanitary_monitoring';
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
    defaultValues: activityFormDefaults(activity, preset),
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
  const { setValue } = form;
  const producer = useActivityProducerChoice({
    editing: !!activity,
    preset,
    onChange: () => {
      setFarmFilter('');
      setValue('farm_id', '');
      setValue('plot_id', '');
      setValue('assignee_id', '');
    },
  });
  const choices = useActivityFormChoices(
    farmFilter,
    plotId,
    activity,
    producer.producerId,
    preset?.activityType,
  );
  const fixedPlot = useMemo(
    () =>
      activity && {
        farm: activity.plot.farm.name,
        plot: activity.plot.code,
      },
    [activity],
  );

  const reportInvalid = (fieldErrors: FieldErrors<ActivityFormInput>) => {
    const missing = Object.values(fieldErrors).some(
      (error) => error?.message === REQUIRED_FIELD_MESSAGE,
    );
    submission.setSummary(missing ? MISSING_FIELDS_MESSAGE : undefined);
  };
  const delayed =
    !!activity && activityState(activity, today).state === 'delayed';

  return (
    <FormDialog
      {...activityFormTexts(!!activity, monitoring)}
      error={submission.summary}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={(event) => {
        void form.handleSubmit(submission.submit, reportInvalid)(event);
      }}
    >
      {delayed && !submission.summary && (
        <p
          className="rounded-md border border-warn/30 bg-warn-bg px-4 py-3 text-sm leading-6 font-bold text-warn"
          role="status"
        >
          {DELAYED_EDIT_NOTICE}
        </p>
      )}
      <ActivityFormFields
        {...choices}
        disabled={isSaving}
        errors={errors}
        fixedPlot={fixedPlot}
        form={form}
        hideType={monitoring}
        onFarmFilter={setFarmFilter}
        producer={producer.field}
        today={today}
      />
    </FormDialog>
  );
}
