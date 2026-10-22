'use client';

import { Plus } from 'lucide-react';
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from 'react-hook-form';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/form-message';

import { emptyDetection, type MonitoringFormInput } from '../monitoring-form';
import type { MonitoringFormValues } from '../monitoring-schema';
import type { PestDisease } from '../pest-api';
import { DetectionCard } from './detection-card';

export const NO_PEST_CATALOG_MESSAGE =
  'Necesitas conexión una vez para cargar las plagas y enfermedades. Mientras tanto puedes elegir Otra.';

// Lo que se encontró: una o varias detecciones. Cada una lleva el id que genera el dispositivo, así
// que desde ella se puede programar un control aunque el monitoreo siga en la cola.
export function DetectionsSection({
  control,
  register,
  errors,
  pests,
  disabled,
}: {
  control: Control<MonitoringFormInput, unknown, MonitoringFormValues>;
  register: UseFormRegister<MonitoringFormInput>;
  errors: FieldErrors<MonitoringFormInput>;
  pests: readonly PestDisease[] | undefined;
  disabled: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detections',
  });
  // El error de la lista entera (sin detecciones) llega en `root` o en el mensaje del arreglo.
  const listError =
    errors.detections?.root?.message ?? errors.detections?.message;

  return (
    <FormSection compact title="Detecciones">
      <div className="space-y-3">
        {!pests && (
          <p className="text-sm font-bold text-warn">
            {NO_PEST_CATALOG_MESSAGE}
          </p>
        )}
        {fields.length > 0 && (
          <ul className="space-y-3">
            {fields.map((field, index) => (
              <DetectionCard
                control={control}
                disabled={disabled}
                errors={errors}
                index={index}
                key={field.id}
                onRemove={() => remove(index)}
                pests={pests}
                register={register}
              />
            ))}
          </ul>
        )}
        {listError && <InlineError>{listError}</InlineError>}
        <Button
          className={CAPTURE_BUTTON_CLASS}
          disabled={disabled}
          onClick={() =>
            append(emptyDetection(crypto.randomUUID(), crypto.randomUUID()))
          }
          size="office"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-5" /> Agregar detección
        </Button>
      </div>
    </FormSection>
  );
}
