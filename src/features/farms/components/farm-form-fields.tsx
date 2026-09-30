'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormSection } from '@/components/form-section';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { useMunicipalities } from '@/lib/api/municipalities';
import { OPERATING_DEPARTMENT } from '@/lib/departments';
import type { Coordinates } from '@/types/geo';

import { farmFormSchema, type FarmFormValues } from '../schemas';
import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from './capture-field-class';
import { useGeolocation } from '../use-geolocation';
import { FarmLocationFields, FarmLocationMap } from './farm-location-capture';

export function FarmFormFields({
  defaultValues,
  title,
  description,
  banner,
  notice,
  submitLabel,
  isSaving,
  error,
  blockedMessage,
  onSubmit,
}: {
  defaultValues: FarmFormValues;
  title: string;
  description: string;
  banner?: ReactNode;
  notice?: ReactNode;
  submitLabel: string;
  isSaving: boolean;
  error?: string | null;
  // Si hay motivo, no se puede guardar: se explica junto al botón.
  blockedMessage?: string | null;
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
  const geolocation = useGeolocation(changeLocation);
  const location = { latitude, longitude };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Gestión de fincas"
        title={title}
        description={description}
      />
      {banner && <div className="mt-6">{banner}</div>}
      {notice}
      {/* En escritorio, datos a la izquierda y mapa a la derecha (fijo al bajar); en celular,
          una columna con el mapa antes de guardar, porque el punto se marca antes de guardar.
          Bajo el mapa queda sitio para lo que dependa de la finca (sus parcelas). */}
      <form
        className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="space-y-6 lg:col-start-1 lg:row-start-1">
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
                      : 'Elige un municipio'}
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
            <FarmLocationFields
              geolocation={geolocation}
              latitudeError={errors.latitude?.message}
              location={location}
              longitudeError={errors.longitude?.message}
              onLocationChange={changeLocation}
            />
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] bg-card p-4 shadow-card empty:hidden lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <FarmLocationMap
            disabled={geolocation.isCapturing}
            frameClassName="lg:h-[34rem]"
            location={location}
            onLocationChange={changeLocation}
          />
        </div>

        <div className="space-y-4 lg:col-start-1 lg:row-start-2">
          {error && (
            <p
              className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err"
              role="alert"
            >
              {error}
            </p>
          )}

          {blockedMessage && (
            <p className="font-bold text-warn" id="farm-save-blocked">
              {blockedMessage}
            </p>
          )}
          <Button
            aria-describedby={blockedMessage ? 'farm-save-blocked' : undefined}
            className={CAPTURE_BUTTON_CLASS}
            disabled={isSaving || !!blockedMessage}
            size="office"
            type="submit"
          >
            {isSaving ? 'Guardando…' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
