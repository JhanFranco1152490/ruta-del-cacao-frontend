'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormSection } from '@/components/form-section';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { useMunicipalities } from '@/features/catalogs/api';
import { OPERATING_DEPARTMENT } from '@/features/catalogs/departments';
import type { Coordinates } from '@/types/geo';

import { farmFormSchema, type FarmFormValues } from '../schemas';
import { CAPTURE_FIELD_CLASS } from './capture-field-class';
import { FarmLocationCapture } from './farm-location-capture';

export function FarmFormFields({
  defaultValues,
  title,
  description,
  notice,
  submitLabel,
  isSaving,
  error,
  onSubmit,
}: {
  defaultValues: FarmFormValues;
  title: string;
  description: string;
  notice?: ReactNode;
  submitLabel: string;
  isSaving: boolean;
  error?: string | null;
  onSubmit: (values: FarmFormValues) => void;
}) {
  const municipalities = useMunicipalities();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<FarmFormValues>({
    resolver: zodResolver(farmFormSchema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const [latitude, longitude] = useWatch({
    control,
    name: ['latitude', 'longitude'],
  });

  const changeLocation = (location: Coordinates) => {
    const options = { shouldDirty: true, shouldValidate: isSubmitted };
    setValue('latitude', location.latitude, options);
    setValue('longitude', location.longitude, options);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Gestión de fincas"
        title={title}
        description={description}
      />
      {notice}
      <form
        className="mt-8 space-y-6"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <FormSection title="Datos de la finca">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              className={CAPTURE_FIELD_CLASS}
              error={errors.name?.message}
              label="Nombre de la finca"
              maxLength={200}
              wrapperClassName="sm:col-span-2"
              {...register('name')}
            />
            <TextField
              className={CAPTURE_FIELD_CLASS}
              label="Departamento"
              readOnly
              value={OPERATING_DEPARTMENT.name}
            />
            <div>
              {/* Se remonta al llegar el catálogo: un select no controlado no vuelve a aplicar
                  el valor guardado cuando aparecen sus opciones (al corregir quedaría en blanco). */}
              <SelectField
                key={municipalities.isSuccess ? 'ready' : 'loading'}
                className={CAPTURE_FIELD_CLASS}
                disabled={!municipalities.isSuccess}
                error={errors.municipality_id?.message}
                label="Municipio"
                {...register('municipality_id')}
              >
                <option value="">
                  {municipalities.isPending
                    ? 'Cargando municipios…'
                    : 'Selecciona un municipio'}
                </option>
                {municipalities.data?.map((municipality) => (
                  <option key={municipality.code} value={municipality.code}>
                    {municipality.name}
                  </option>
                ))}
              </SelectField>
              {municipalities.isError && (
                <p className="mt-2 text-sm font-medium text-err" role="alert">
                  No fue posible cargar los municipios. Inténtalo nuevamente.
                </p>
              )}
            </div>
            <TextField
              className={CAPTURE_FIELD_CLASS}
              error={errors.details?.message}
              hint="Vereda u otros detalles de ubicación (por ejemplo, km)"
              label="Detalles (opcional)"
              wrapperClassName="sm:col-span-2"
              {...register('details')}
            />
            <TextField
              className={CAPTURE_FIELD_CLASS}
              error={errors.area_hectares?.message}
              inputMode="decimal"
              label="Área total (hectáreas)"
              {...register('area_hectares')}
            />
            <TextField
              className={CAPTURE_FIELD_CLASS}
              error={errors.altitude_masl?.message}
              inputMode="numeric"
              label="Altitud (m s. n. m.)"
              {...register('altitude_masl')}
            />
          </div>
        </FormSection>

        <div className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
          <FarmLocationCapture
            latitudeError={errors.latitude?.message}
            location={{ latitude, longitude }}
            longitudeError={errors.longitude?.message}
            onLocationChange={changeLocation}
          />
        </div>

        {error && (
          <p
            className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err"
            role="alert"
          >
            {error}
          </p>
        )}

        <Button
          className="w-full sm:w-auto"
          disabled={isSaving}
          size="field"
          type="submit"
        >
          {isSaving ? 'Guardando…' : submitLabel}
        </Button>
      </form>
    </div>
  );
}
