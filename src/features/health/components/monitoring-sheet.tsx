'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { TextAreaField } from '@/components/text-area-field';
import { Button } from '@/components/ui/button';

import type { MonitoringFormInput } from '../monitoring-form';
import {
  createMonitoringSchema,
  type MonitoringFormValues,
  NOTES_MAX_LENGTH,
} from '../monitoring-schema';
import type { PestDisease } from '../pest-api';
import { DetectionsSection } from './detections-section';
import { SamplingFields } from './sampling-fields';

// La planilla del monitoreo: el muestreo, lo que se encontró y las observaciones. Al enviar entrega
// los valores ya validados; quien la usa los confirma con la persona antes de guardarlos, porque un
// monitoreo registrado no se corrige.
export function MonitoringSheet({
  scheduledAt,
  today,
  pests,
  defaultValues,
  isSaving,
  submitLabel,
  blockedMessage,
  onSubmit,
  secondaryAction,
}: {
  // Cuándo se programó el monitoreo: la fecha de realización no puede ser anterior.
  scheduledAt: string;
  today: string;
  pests: readonly PestDisease[] | undefined;
  defaultValues: MonitoringFormInput;
  isSaving: boolean;
  submitLabel: string;
  blockedMessage?: string | null;
  onSubmit: (values: MonitoringFormValues) => void;
  secondaryAction?: ReactNode;
}) {
  const schema = useMemo(
    () => createMonitoringSchema({ today, scheduledAt }),
    [today, scheduledAt],
  );
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, submitCount, isValid },
  } = useForm<MonitoringFormInput, unknown, MonitoringFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const noPresence = useWatch({ control, name: 'no_presence' });

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
    >
      {submitCount > 0 && !isValid && (
        <p
          className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err"
          role="alert"
        >
          Revisa los datos marcados antes de guardar.
        </p>
      )}
      <SamplingFields
        control={control}
        disabled={isSaving}
        errors={errors}
        register={register}
        today={today}
      />
      {!noPresence && (
        <DetectionsSection
          control={control}
          disabled={isSaving}
          errors={errors}
          pests={pests}
          register={register}
        />
      )}
      <FormSection title="Observaciones">
        <TextAreaField
          disabled={isSaving}
          error={errors.notes?.message}
          hint="Lo que no cabe en números. Por ejemplo, un foco de infección en la zona baja."
          label="Observaciones (opcional)"
          maxLength={NOTES_MAX_LENGTH}
          {...register('notes')}
        />
      </FormSection>
      <div className="space-y-4">
        {blockedMessage && (
          <p className="font-bold text-warn" id="monitoring-save-blocked">
            {blockedMessage}
          </p>
        )}
        <MobileActionBar>
          <Button
            aria-describedby={
              blockedMessage ? 'monitoring-save-blocked' : undefined
            }
            className={CAPTURE_BUTTON_CLASS}
            disabled={isSaving || !!blockedMessage}
            size="office"
            type="submit"
          >
            {isSaving ? 'Guardando…' : submitLabel}
          </Button>
          {secondaryAction}
        </MobileActionBar>
      </div>
    </form>
  );
}
