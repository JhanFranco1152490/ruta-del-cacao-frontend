'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useMemo } from 'react';
import { type UseFormSetError, useForm, useWatch } from 'react-hook-form';

import { FormMessage } from '@/components/form-message';
import { PageHeader } from '@/components/page-header';

import {
  createLogFormSchema,
  type LogFormInput,
  type LogFormValues,
  turnFrequencyVisible,
} from '../log-form';
import { LogFields } from './log-fields';
import { LogFormActions } from './log-form-actions';

// La pantalla de campo de la bitácora: se llena junto a la marquesina, con el medidor de humedad en
// la mano. El título dice qué día de secado será según la fecha elegida.
export function LogFormFields({
  defaultValues,
  startedAt,
  targetMoisture,
  heading,
  description,
  notices,
  submitLabel,
  isSaving,
  disabledMessage,
  formError,
  logsHref,
  cancelHref,
  onSubmit,
}: {
  defaultValues: LogFormInput;
  startedAt: string;
  // La meta de humedad del productor, como referencia al medir.
  targetMoisture: { min: string; max: string };
  // El título según la fecha que tiene el campo (`yyyy-MM-ddTHH:mm`, o vacío).
  heading: (localTime: string) => string;
  description: string;
  // Lo que va entre el título y los campos: la bitácora anterior, los avisos.
  notices?: ReactNode;
  submitLabel: string;
  isSaving: boolean;
  // Por qué no se puede guardar ahora (sin conexión al corregir, la sesión vencida).
  disabledMessage?: string | null;
  formError?: string;
  // La ficha del lote, con sus bitácoras.
  logsHref: string;
  cancelHref: string;
  onSubmit: (
    values: LogFormValues,
    setError: UseFormSetError<LogFormInput>,
  ) => void;
}) {
  const resolver = useMemo(
    () => zodResolver(createLogFormSchema({ startedAt })),
    [startedAt],
  );
  const { control, register, handleSubmit, setError, formState } = useForm<
    LogFormInput,
    unknown,
    LogFormValues
  >({ resolver, defaultValues });
  const localTime = useWatch({ control, name: 'measured_at' });
  const turnCount = useWatch({ control, name: 'turn_count' });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) =>
        void handleSubmit((values) => onSubmit(values, setError))(event)
      }
    >
      <PageHeader
        description={description}
        eyebrow="Secado"
        title={heading(localTime)}
      />
      {notices}
      {formError && <FormMessage>{formError}</FormMessage>}
      <LogFields
        control={control}
        errors={formState.errors}
        isSaving={isSaving}
        localTime={localTime}
        logsHref={logsHref}
        register={register}
        startedAt={startedAt}
        targetMoisture={targetMoisture}
        withTurns={turnFrequencyVisible(turnCount)}
      />
      <LogFormActions
        cancelHref={cancelHref}
        disabledMessage={disabledMessage}
        isSaving={isSaving}
        submitLabel={submitLabel}
      />
    </form>
  );
}
