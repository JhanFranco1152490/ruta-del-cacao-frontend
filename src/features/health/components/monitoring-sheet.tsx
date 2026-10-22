'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  type FieldPath,
  FormProvider,
  useForm,
  useWatch,
} from 'react-hook-form';

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
import {
  recommendationFor,
  unitHint,
  unitRecommendation,
} from '../recommendations';
import { type ControlChoices, ControlChoicesContext } from '../control-choices';
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
  choices,
  initialErrors = [],
  photosField,
  plotTrees = null,
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
  // Lo que ofrece el control de cada detección, salvo la fecha de hoy, que ya llega aparte.
  choices: Omit<ControlChoices, 'today'>;
  // Lo que hay que volver a elegir al abrir una corrección (una plaga que ya no está activa).
  initialErrors?: readonly {
    name: FieldPath<MonitoringFormInput>;
    message: string;
  }[];
  // Las fotos: no son parte del formulario (son archivos), las lleva quien guarda.
  photosField?: ReactNode;
  // Los árboles que suma la ficha de la parcela, si se saben: son el tope de lo que se evalúa.
  plotTrees?: number | null;
}) {
  const schema = useMemo(
    () => createMonitoringSchema({ today, scheduledAt, plotTrees }),
    [today, scheduledAt, plotTrees],
  );
  const form = useForm<MonitoringFormInput, unknown, MonitoringFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, submitCount, isValid },
  } = form;
  const controlChoices = useMemo(
    () => ({ ...choices, today }),
    [choices, today],
  );
  const noPresence = useWatch({ control, name: 'no_presence' });
  const unit = useWatch({ control, name: 'sampling_unit' });
  const detections = useWatch({ control, name: 'detections' });
  // Lo que el catálogo sugiere para las plagas elegidas. Sin presencia no hay detecciones.
  const recommendations = useMemo(
    () =>
      noPresence
        ? []
        : (detections ?? []).map((row) =>
            recommendationFor(pests, row.pest_disease_id),
          ),
    [detections, pests, noPresence],
  );
  const recommendedUnit = unitRecommendation(recommendations);
  // La unidad sigue a la plaga mientras la persona no la haya elegido. Al abrir (una corrección
  // que vuelve con su unidad) no se cambia nada: solo cuenta lo que cambie después.
  const unitPickedByHand = useRef(false);
  const lastRecommendedUnit = useRef(recommendedUnit);
  useEffect(() => {
    if (lastRecommendedUnit.current === recommendedUnit) return;
    lastRecommendedUnit.current = recommendedUnit;
    if (recommendedUnit && !unitPickedByHand.current) {
      form.setValue('sampling_unit', recommendedUnit, { shouldDirty: true });
    }
  }, [recommendedUnit, form]);
  // Solo al abrir: después cada campo se valida con su regla.
  useEffect(() => {
    for (const { name, message } of initialErrors) {
      form.setError(name, { type: 'manual', message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormProvider {...form}>
      <ControlChoicesContext value={controlChoices}>
        <form
          className="space-y-4"
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
          {/* En escritorio, el muestreo y las detecciones a la izquierda y lo de apoyo (observaciones
              y fotos) a la derecha; en celular, una sola columna en ese mismo orden. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-start">
            <div className="space-y-4 lg:col-span-3">
              <SamplingFields
                control={control}
                disabled={isSaving}
                errors={errors}
                onUnitPicked={() => {
                  unitPickedByHand.current = true;
                }}
                plotTrees={plotTrees}
                register={register}
                today={today}
                unitHint={unitHint(recommendations, unit)}
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
            </div>
            <div className="space-y-4 lg:col-span-2">
              <FormSection compact title="Observaciones">
                <TextAreaField
                  disabled={isSaving}
                  error={errors.notes?.message}
                  hint="Lo que no cabe en números. Por ejemplo, un foco de infección en la zona baja."
                  label="Observaciones (opcional)"
                  maxLength={NOTES_MAX_LENGTH}
                  {...register('notes')}
                />
              </FormSection>
              {photosField}
            </div>
          </div>
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
      </ControlChoicesContext>
    </FormProvider>
  );
}
