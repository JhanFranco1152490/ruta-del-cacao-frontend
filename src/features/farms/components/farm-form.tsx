'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormSection } from '@/components/form-section';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { useMunicipalities } from '@/features/catalogs/api';
import { OPERATING_DEPARTMENT } from '@/features/catalogs/departments';
import type { Coordinates } from '@/types/geo';

import { emptyFarmForm, farmFormSchema, type FarmFormValues } from '../schemas';
import { useFarmCreate } from '../use-farm-create';
import { CAPTURE_FIELD_CLASS } from './capture-field-class';
import { FarmLocationCapture } from './farm-location-capture';
import { FarmSavedPanel } from './farm-saved-panel';

export function FarmForm() {
  // Un id por formulario: si se guarda dos veces (doble toque, reintento), la cola lo reconoce
  // y no duplica la finca. Registrar otra finca monta un formulario nuevo con otro id.
  const [farmId, setFarmId] = useState(() => crypto.randomUUID());
  const [savedName, setSavedName] = useState<string | null>(null);

  if (savedName) {
    return (
      <FarmSavedPanel
        name={savedName}
        onRegisterAnother={() => {
          setFarmId(crypto.randomUUID());
          setSavedName(null);
        }}
      />
    );
  }

  return <FarmFormFields key={farmId} farmId={farmId} onSaved={setSavedName} />;
}

function FarmFormFields({
  farmId,
  onSaved,
}: {
  farmId: string;
  onSaved: (name: string) => void;
}) {
  const municipalities = useMunicipalities();
  const create = useFarmCreate();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<FarmFormValues>({
    resolver: zodResolver(farmFormSchema),
    defaultValues: emptyFarmForm,
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

  const save = (values: FarmFormValues) =>
    create.mutate(
      { id: farmId, values },
      { onSuccess: () => onSaved(values.name) },
    );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Gestión de fincas"
        title="Registrar finca"
        description="Los campos marcados son obligatorios. Si no hay conexión, la finca se guarda en el teléfono y se envía cuando vuelva la señal."
      />
      <form className="mt-8 space-y-6" noValidate onSubmit={handleSubmit(save)}>
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
              <SelectField
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

        {create.isError && (
          <p
            className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err"
            role="alert"
          >
            No fue posible guardar la finca en el dispositivo. Inténtalo
            nuevamente.
          </p>
        )}

        <Button
          className="w-full sm:w-auto"
          disabled={create.isPending}
          size="field"
          type="submit"
        >
          {create.isPending ? 'Guardando…' : 'Guardar finca'}
        </Button>
      </form>
    </div>
  );
}
