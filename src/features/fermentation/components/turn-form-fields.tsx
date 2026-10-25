'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { type ReactNode, useMemo } from 'react';
import { type UseFormSetError, useForm, useWatch } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { FormMessage } from '@/components/form-message';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { PageHeader } from '@/components/page-header';
import { TextAreaField } from '@/components/text-area-field';
import { TextField } from '@/components/text-field';
import { Button, buttonVariants } from '@/components/ui/button';
import { fromBogotaLocal, toBogotaLocal } from '@/lib/format/dates';

import { hoursBetween } from '@/lib/format/hours';
import { DUPLICATE_ERROR } from '../turn-errors';
import {
  createTurnFormSchema,
  type TurnFormInput,
  type TurnFormValues,
} from '../turn-form';
import { isLocalDateTime, NOTES_MAX_LENGTH } from '@/lib/validation/moment';
import {
  phHint,
  type ReferenceRange,
  temperatureHint,
} from '../reference-hint';

// Lo que se mide va en grande y centrado: se lee a un brazo de distancia, con el medidor en la otra
// mano.
const MEASURE_FIELD_CLASS = `${CAPTURE_FIELD_CLASS} text-center text-xl font-bold tabular-nums`;

// La pantalla de campo del volteo: se llena junto al cajón, con el termómetro y el medidor de pH en
// la mano. El título dice qué volteo será según la hora elegida.
export function TurnFormFields({
  defaultValues,
  startedAt,
  heading,
  description,
  notices,
  submitLabel,
  isSaving,
  disabledMessage,
  formError,
  reference,
  turnsHref,
  cancelHref,
  onSubmit,
}: {
  defaultValues: TurnFormInput;
  startedAt: string;
  // El título según la hora que tiene el campo (`yyyy-MM-ddTHH:mm`, o vacío).
  heading: (localTime: string) => string;
  description: string;
  // Lo que va entre el título y los campos: el volteo anterior, los avisos.
  notices?: ReactNode;
  submitLabel: string;
  isSaving: boolean;
  // Por qué no se puede guardar ahora (sin conexión al corregir, la sesión vencida).
  disabledMessage?: string | null;
  formError?: string;
  // La temperatura y el pH que el productor tiene como referencia; faltan en una copia anterior a
  // los parámetros.
  reference?: { temperature: ReferenceRange; ph: ReferenceRange };
  // La ficha del lote, con sus volteos.
  turnsHref: string;
  cancelHref: string;
  onSubmit: (
    values: TurnFormValues,
    setError: UseFormSetError<TurnFormInput>,
  ) => void;
}) {
  const resolver = useMemo(
    () => zodResolver(createTurnFormSchema({ startedAt })),
    [startedAt],
  );
  const { control, register, handleSubmit, setError, formState } = useForm<
    TurnFormInput,
    unknown,
    TurnFormValues
  >({ resolver, defaultValues });
  const { errors } = formState;
  const localTime = useWatch({ control, name: 'turned_at' });
  const [temperature, ph] = useWatch({
    control,
    name: ['temperature_c', 'ph'],
  });
  const sinceStart = isLocalDateTime(localTime)
    ? Math.floor(hoursBetween(startedAt, fromBogotaLocal(localTime)))
    : null;

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
        eyebrow="Fermentación"
        title={heading(localTime)}
      />
      {notices}
      {formError && <FormMessage>{formError}</FormMessage>}
      {/* Los campos juntos en una tarjeta, con temperatura y pH lado a lado también en celular: la
          pantalla se llena de pie junto al cajón y así cabe sin desplazarse tanto. */}
      <div className="grid grid-cols-2 gap-4 rounded-[var(--radius-card)] bg-card p-4 shadow-card sm:p-5">
        <div className="col-span-2 space-y-2">
          <TextField
            className={CAPTURE_FIELD_CLASS}
            disabled={isSaving}
            error={errors.turned_at?.message}
            hint={
              sinceStart !== null && sinceStart >= 0
                ? `${sinceStart} h desde el inicio`
                : undefined
            }
            label="Fecha y hora del volteo"
            max={toBogotaLocal(new Date().toISOString())}
            min={toBogotaLocal(startedAt)}
            type="datetime-local"
            {...register('turned_at')}
          />
          {errors.turned_at?.type === DUPLICATE_ERROR && (
            <Link className="font-bold underline" href={turnsHref}>
              Ver los volteos
            </Link>
          )}
        </div>
        <TextField
          className={MEASURE_FIELD_CLASS}
          disabled={isSaving}
          error={errors.temperature_c?.message}
          hint={
            reference
              ? temperatureHint(temperature, reference.temperature)
              : 'En el centro de la masa.'
          }
          inputMode="decimal"
          label="Temperatura (°C)"
          {...register('temperature_c')}
        />
        <TextField
          className={MEASURE_FIELD_CLASS}
          disabled={isSaving}
          error={errors.ph?.message}
          hint={reference ? phHint(ph, reference.ph) : undefined}
          inputMode="decimal"
          label="pH"
          {...register('ph')}
        />
        <TextAreaField
          disabled={isSaving}
          error={errors.notes?.message}
          className="min-h-16"
          label="Observaciones (opcional)"
          placeholder={`Hasta ${NOTES_MAX_LENGTH} caracteres`}
          rows={2}
          wrapperClassName="col-span-2"
          {...register('notes')}
        />
      </div>
      <div className="space-y-4">
        {disabledMessage && (
          <p className="font-bold text-warn" id="turn-save-blocked">
            {disabledMessage}
          </p>
        )}
        <MobileActionBar>
          <Button
            aria-describedby={disabledMessage ? 'turn-save-blocked' : undefined}
            className="w-full sm:w-auto"
            disabled={isSaving || !!disabledMessage}
            size="field"
            type="submit"
          >
            {isSaving ? 'Guardando…' : submitLabel}
          </Button>
          <Link
            className={buttonVariants({
              size: 'field',
              variant: 'outline',
              className: 'w-full sm:w-auto',
            })}
            href={cancelHref}
          >
            Cancelar
          </Link>
        </MobileActionBar>
      </div>
    </form>
  );
}
