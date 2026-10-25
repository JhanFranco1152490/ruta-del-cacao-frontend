'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { SearchSelect } from '@/components/search-select';
import { SelectField } from '@/components/select-field';
import { StartWarning } from '@/components/start-warning';
import { TextField } from '@/components/text-field';
import { useSession } from '@/hooks/use-session';
import { toBogotaLocal } from '@/lib/format/dates';
import { responsibleOptions } from '@/lib/responsible-options';

import type { Drying, StartOptions } from '../api';
import { rangeText } from '../moisture';
import {
  createStartFormSchema,
  facilityOptionLabel,
  startFormOf,
  type StartFormInput,
} from '../start-form';
import { useStartSubmit } from '../use-start-submit';
import type { StartLot } from './start-drying-dialog';

export function StartDryingForm({
  lot,
  drying,
  options,
  title,
  description,
  submitLabel,
  facilitiesHref,
  reloadOptions,
  onClose,
  onSaved,
}: {
  lot: StartLot;
  drying?: Drying;
  options: StartOptions;
  title: string;
  description: string;
  submitLabel: string;
  facilitiesHref?: string;
  reloadOptions: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: user } = useSession();
  const [now] = useState(() => new Date());
  const resolver = useMemo(
    () =>
      zodResolver(
        createStartFormSchema({ earliestStartAt: options.earliest_start_at }),
      ),
    [options.earliest_start_at],
  );
  const form = useForm<StartFormInput>({
    resolver,
    defaultValues: startFormOf({ options, userId: user?.id, now, drying }),
  });
  const { errors } = form.formState;
  const submission = useStartSubmit({
    lot,
    drying,
    options,
    form,
    reloadOptions,
    onSaved,
    onClose,
  });
  const people = responsibleOptions(options.responsibles, drying?.responsible);
  const noDryers = options.facilities.length === 0;

  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={description}
      error={submission.summary}
      isSaving={submission.isSaving}
      onClose={onClose}
      onSubmit={(event) =>
        void form.handleSubmit((values) => submission.send(values, false))(
          event,
        )
      }
      submitDisabled={noDryers}
      submitLabel={submitLabel}
      title={title}
    >
      {submission.warning && (
        <StartWarning
          disabled={submission.isSaving}
          message={submission.warning}
          onConfirm={() =>
            void form.handleSubmit((values) => submission.send(values, true))()
          }
          onReview={submission.dismissWarning}
        />
      )}
      {noDryers ? (
        <div className="space-y-2 rounded-(--radius) bg-warn-bg px-4 py-3">
          <p className="font-bold text-warn">
            No hay marquesinas disponibles en {lot.farm.name}.
          </p>
          {facilitiesHref && (
            <Link className="font-bold underline" href={facilitiesHref}>
              Ver infraestructura
            </Link>
          )}
        </div>
      ) : (
        <SelectField
          disabled={submission.isSaving}
          error={errors.facility_id?.message}
          hint="Solo marquesinas disponibles de la finca del lote."
          label="Marquesina"
          {...form.register('facility_id', {
            onChange: submission.dismissWarning,
          })}
        >
          <option disabled value="">
            Elige una marquesina
          </option>
          {options.facilities.map((dryer) => (
            <option key={dryer.id} value={dryer.id}>
              {facilityOptionLabel(dryer)}
            </option>
          ))}
        </SelectField>
      )}
      <TextField
        disabled={submission.isSaving}
        error={errors.started_at?.message}
        label="Fecha y hora de inicio"
        max={toBogotaLocal(now.toISOString())}
        min={toBogotaLocal(options.earliest_start_at)}
        type="datetime-local"
        {...form.register('started_at')}
      />
      <TextField
        disabled={submission.isSaving}
        error={errors.entry_moisture_pct?.message}
        hint={`Humedad esperada: ${rangeText(options.entry_moisture_range)}.`}
        inputMode="decimal"
        label="Humedad de entrada (%)"
        {...form.register('entry_moisture_pct', {
          onChange: submission.dismissWarning,
        })}
      />
      <Controller
        control={form.control}
        name="responsible_id"
        render={({ field }) => (
          <SearchSelect
            disabled={submission.isSaving}
            error={errors.responsible_id?.message}
            label="Responsable"
            onBlur={field.onBlur}
            onChange={(option) => field.onChange(option?.id ?? '')}
            options={people}
            placeholder="Elige quién responde"
            value={people.find(({ id }) => id === field.value) ?? null}
          />
        )}
      />
    </FormDialog>
  );
}
