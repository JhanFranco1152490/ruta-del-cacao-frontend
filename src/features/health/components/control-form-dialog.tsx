'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { SubmitButton } from '@/components/submit-button';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { components } from '@/lib/api/schema';
import { todayInBogota } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';
import { notify } from '@/lib/notify';

import {
  type ControlFormInput,
  type ControlFormValues,
  createControlSchema,
  emptyControlForm,
  toDetectionControlRequest,
} from '../control-schema';
import { type Detection, detectionName } from '../detection-status';
import { useSaveControl } from '../use-control-actions';
import { ControlAssigneeField } from './control-assignee-field';
import { ControlChoicesContext } from './control-choices';
import { DoneControlFields } from './done-control-fields';
import { ScheduledControlFields } from './scheduled-control-fields';
import { useControlChoicesSource } from './use-control-choices-source';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

const SAVED = {
  scheduled: 'Control fitosanitario programado',
  done: 'Control registrado como realizado',
} as const;

// Un control que se decide después del recorrido: programado, o registrado como ya hecho. Se guarda
// en el dispositivo y se envía cuando haya conexión, como la planilla.
export function ControlFormDialog({
  mode,
  detection,
  monitoring,
  onClose,
}: {
  mode: ControlFormInput['mode'];
  detection: Detection;
  // El monitoreo realizado en que se encontró la detección.
  monitoring: AgriculturalActivity;
  onClose: () => void;
}) {
  const today = todayInBogota();
  const save = useSaveControl();
  const { choices } = useControlChoicesSource({
    farmId: monitoring.plot.farm.id,
    producerId: monitoring.producer_id,
    enabled: true,
  });
  const schema = useMemo(
    () =>
      createControlSchema({
        today,
        monitoringDate: monitoring.done_date ?? today,
      }),
    [today, monitoring.done_date],
  );
  // El id se fija al abrir: guardar dos veces no crea dos controles.
  const [defaultValues] = useState(() =>
    emptyControlForm(crypto.randomUUID(), mode, today),
  );
  const form = useForm<ControlFormInput, unknown, ControlFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const controlChoices = useMemo(
    () => ({ ...choices, today }),
    [choices, today],
  );
  const name = detectionName(detection);

  const submit = (values: ControlFormValues) =>
    save.mutate(
      {
        detectionId: detection.id,
        payload: {
          request: toDetectionControlRequest(values, new Date().toISOString()),
          label: `${name} · ${monitoring.plot.code}`,
        },
      },
      {
        onSuccess: () => {
          onClose();
          notify.success(SAVED[mode]);
        },
      },
    );

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      open
    >
      <DialogContent showCloseButton={!save.isPending}>
        <FormProvider {...form}>
          <ControlChoicesContext value={controlChoices}>
            <form
              className="space-y-4"
              noValidate
              onSubmit={(event) => void form.handleSubmit(submit)(event)}
            >
              <DialogHeader>
                <DialogTitle>
                  {mode === 'done'
                    ? 'Registrar control realizado'
                    : 'Programar control'}
                </DialogTitle>
                <DialogDescription>
                  Atiende: {name} {formatDecimal(detection.incidence, 2)} % ·{' '}
                  {monitoring.plot.code}
                </DialogDescription>
              </DialogHeader>
              {mode === 'done' ? (
                <>
                  <TextField
                    className={CAPTURE_FIELD_CLASS}
                    disabled={save.isPending}
                    error={form.formState.errors.done_date?.message}
                    label="Fecha de aplicación"
                    max={today}
                    type="date"
                    {...form.register('done_date')}
                  />
                  <ControlAssigneeField
                    disabled={save.isPending}
                    name="assignee_id"
                  />
                  <DoneControlFields base="" disabled={save.isPending} />
                </>
              ) : (
                <ScheduledControlFields base="" disabled={save.isPending} />
              )}
              {save.isError && (
                <p className="text-sm font-bold text-err" role="alert">
                  No fue posible guardar el control en el dispositivo. Inténtalo
                  nuevamente.
                </p>
              )}
              <DialogFooter>
                <Button
                  disabled={save.isPending}
                  onClick={onClose}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <SubmitButton
                  className="sm:w-auto"
                  pending={save.isPending}
                  pendingLabel="Guardando…"
                >
                  {mode === 'done' ? 'Registrar control' : 'Programar control'}
                </SubmitButton>
              </DialogFooter>
            </form>
          </ControlChoicesContext>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
