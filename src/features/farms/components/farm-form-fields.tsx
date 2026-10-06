'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Breadcrumb, type Crumb } from '@/components/breadcrumb';
import { FormSection } from '@/components/form-section';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { useMunicipalities } from '@/lib/api/municipalities';
import { altitudeRangeFor } from '@/lib/geo/municipality-altitude';
import { OPERATING_DEPARTMENT } from '@/lib/departments';
import type { Coordinates } from '@/types/geo';

import { createFarmFormSchema, type FarmFormValues } from '../schemas';
import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from '@/components/capture-field-class';
import {
  COORDINATES_ALTERNATIVES,
  useGeolocation,
} from '@/hooks/use-geolocation';
import { useWarmGps } from '@/hooks/use-warm-gps';
import { useMunicipalityHints } from '../use-municipality-hints';
import { FarmLocationFields, FarmLocationMap } from './farm-location-capture';
import { FarmProducerField } from './farm-producer-field';
import {
  FarmMunicipalityMismatch,
  FarmMunicipalitySuggestion,
} from './farm-municipality-notice';

export function FarmFormFields({
  defaultValues,
  allocatedHectares,
  savedLocation,
  title,
  description,
  banner,
  notice,
  submitLabel,
  isSaving,
  error,
  blockedMessage,
  secondaryAction,
  chooseProducer = false,
  breadcrumb,
  onSubmit,
}: {
  defaultValues: FarmFormValues;
  // Lo que ya ocupan las parcelas activas de la finca que se edita: el área no puede bajar de ahí.
  allocatedHectares?: number;
  // Municipio y altitud de la finca del servidor que se edita: si no cambian, no se vuelve a exigir
  // que la altitud quepa en el terreno del municipio.
  savedLocation?: { municipalityCode: string; altitude: string };
  title: string;
  description: string;
  banner?: ReactNode;
  notice?: ReactNode;
  submitLabel: string;
  isSaving: boolean;
  error?: string | null;
  // Si hay motivo, no se puede guardar: se explica junto al botón.
  blockedMessage?: string | null;
  // Otra acción junto a guardar (p. ej. eliminar la finca en la edición).
  secondaryAction?: ReactNode;
  // La cuenta técnica elige de qué productor es la finca nueva. Al editar una finca nadie lo elige:
  // no cambia de dueño.
  chooseProducer?: boolean;
  // La ruta hasta esta pantalla (Fincas / La Esperanza / Editar).
  breadcrumb?: readonly Crumb[];
  onSubmit: (values: FarmFormValues) => void;
}) {
  const municipalities = useMunicipalities();
  const municipalityList = municipalities.data;
  const schema = useMemo(
    () =>
      createFarmFormSchema({
        allocatedHectares,
        municipalityName: (code) =>
          municipalityList?.find((municipality) => municipality.code === code)
            ?.name,
        saved: savedLocation,
        requireProducer: chooseProducer,
      }),
    [allocatedHectares, municipalityList, savedLocation, chooseProducer],
  );
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<FarmFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const [latitude, longitude, municipalityId] = useWatch({
    control,
    name: ['latitude', 'longitude', 'municipality_id'],
  });

  const changeLocation = (location: Coordinates) => {
    const options = { shouldDirty: true, shouldValidate: isSubmitted };
    setValue('latitude', location.latitude, options);
    setValue('longitude', location.longitude, options);
  };
  const location = { latitude, longitude };
  const altitudeRange = altitudeRangeFor(municipalityId);
  const altitudeHint = altitudeRange
    ? `En ${municipalities.data?.find((m) => m.code === municipalityId)?.name ?? 'el municipio'} el terreno va de ${altitudeRange.minimum} a ${altitudeRange.maximum} m.`
    : undefined;
  const hints = useMunicipalityHints(location, municipalityId);
  const municipalityName = (code: string) =>
    municipalities.data?.find((municipality) => municipality.code === code)
      ?.name ?? code;
  const chooseMunicipality = (code: string) =>
    setValue('municipality_id', code, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });

  // Municipio que se completó con el GPS: se avisa mientras siga siendo el elegido.
  const [suggested, setSuggested] = useState<string | null>(null);
  const captureLocation = (captured: Coordinates) => {
    changeLocation(captured);
    const code = hints.municipalityAt(captured);
    // Solo si estaba vacío: un municipio elegido a propósito no se cambia solo (si no
    // coincide, aparece la advertencia).
    if (code && !getValues('municipality_id')) {
      chooseMunicipality(code);
      setSuggested(code);
    }
  };
  const geolocation = useGeolocation(captureLocation);
  // Vive aquí y no en los botones: el mapa también necesita saber dónde está la persona.
  const warm = useWarmGps(COORDINATES_ALTERNATIVES);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
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
              {chooseProducer && (
                <div className="sm:col-span-2">
                  <FarmProducerField
                    control={control}
                    error={errors.producer_id?.message}
                  />
                </div>
              )}
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
                hint={altitudeHint}
                inputMode="numeric"
                label="Altitud (m s. n. m.)"
                {...register('altitude_masl')}
              />
            </div>
          </FormSection>

          <div className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 shadow-card">
            <FarmLocationFields
              geolocation={geolocation}
              warm={warm}
              latitudeError={errors.latitude?.message}
              location={location}
              longitudeError={errors.longitude?.message}
              onLocationChange={changeLocation}
            />
            {suggested && suggested === municipalityId && (
              <FarmMunicipalitySuggestion
                municipality={municipalityName(suggested)}
              />
            )}
            {hints.mismatch && (
              <FarmMunicipalityMismatch
                chosenMunicipality={municipalityName(municipalityId)}
                onUsePointMunicipality={() => {
                  if (hints.mismatch) chooseMunicipality(hints.mismatch);
                }}
                pointMunicipality={municipalityName(hints.mismatch)}
              />
            )}
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] bg-card p-4 shadow-card empty:hidden lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <FarmLocationMap
            disabled={geolocation.isCapturing}
            focusBounds={hints.focusBounds}
            gpsPosition={warm.fix}
            onRequestGps={warm.start}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              aria-describedby={
                blockedMessage ? 'farm-save-blocked' : undefined
              }
              className={CAPTURE_BUTTON_CLASS}
              disabled={isSaving || !!blockedMessage}
              size="office"
              type="submit"
            >
              {isSaving ? 'Guardando…' : submitLabel}
            </Button>
            {secondaryAction}
          </div>
        </div>
      </form>
    </div>
  );
}
