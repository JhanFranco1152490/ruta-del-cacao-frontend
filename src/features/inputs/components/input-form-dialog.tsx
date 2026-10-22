'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { type FieldErrors, useForm } from 'react-hook-form';

import { DuplicateNotice } from '@/components/duplicate-notice';
import { ProducerFilter } from '@/components/producer-filter';
import { SelectField } from '@/components/select-field';
import { FormDialog } from '@/components/form-dialog';
import { useProducerSummary } from '@/lib/api/producer-options';

import {
  type AgriculturalInput,
  type ExistingInput,
  useCreateAgriculturalInput,
  useUpdateAgriculturalInput,
} from '../api';
import { formValuesOf } from '../input-form-values';
import {
  createInputFormSchema,
  DUPLICATE_INPUT_MESSAGE,
  findDuplicateInput,
  inputDuplicateKey,
  MISSING_FIELDS_MESSAGE,
  REQUIRED_FIELD_MESSAGE,
  type InputFormInput,
  type InputFormValues,
} from '../schemas';
import type { FarmChoice } from '../input-options';
import { InputFormFields } from './input-form-fields';
import { useInputSubmit } from '../use-input-submit';

// Registrar un insumo, o editar `input` si llega. Se monta al abrirse, así que parte de los
// valores de ese momento y no adopta lecturas posteriores: guardar la versión nueva con valores
// viejos pisaría lo que otra persona cambió.
export function InputFormDialog({
  input,
  catalog,
  producer,
  chooseProducer,
  employeeFarms,
  onClose,
  onSaved,
  onShowExisting,
}: {
  input?: AgriculturalInput;
  catalog: readonly AgriculturalInput[];
  // El productor del filtro de la lista: con él empieza el campo de la cuenta técnica.
  producer: string | null;
  // Solo la cuenta técnica elige de qué productor es el insumo nuevo.
  chooseProducer: boolean;
  // Las fincas de un empleado: el insumo que registra queda en una de ellas, y si son varias
  // elige cuál. Un empleado tampoco cambia la unidad. Ausente para el Productor.
  employeeFarms?: readonly FarmChoice[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onShowExisting: (existing: ExistingInput) => void;
}) {
  const create = useCreateAgriculturalInput();
  const update = useUpdateAgriculturalInput();
  const isSaving = create.isPending || update.isPending;
  const askProducer = chooseProducer && !input;
  const [producerId, setProducerId] = useState(producer);
  const [producerError, setProducerError] = useState<string>();
  const askFarm = !input && (employeeFarms?.length ?? 0) > 1;
  const [farmId, setFarmId] = useState<string | null>(null);
  const [farmError, setFarmError] = useState<string>();
  const selectedProducer = useProducerSummary(
    askProducer ? (producerId ?? undefined) : undefined,
  );
  // Los nombres no se repiten dentro del catálogo del productor del insumo.
  const ownerId = input?.producer.id ?? producerId;
  const others = useMemo(
    () =>
      catalog.filter(
        (other) =>
          other.id !== input?.id && (!ownerId || other.producer.id === ownerId),
      ),
    [catalog, input?.id, ownerId],
  );
  const schema = useMemo(
    () =>
      createInputFormSchema(
        new Set(
          others.map((other) =>
            inputDuplicateKey(other.name, other.input_type),
          ),
        ),
      ),
    [others],
  );
  const form = useForm<InputFormInput, unknown, InputFormValues>({
    resolver: zodResolver(schema),
    defaultValues: formValuesOf(input),
  });
  const { errors } = form.formState;
  const submission = useInputSubmit({
    input,
    form,
    producerId: askProducer ? producerId : null,
    farmId: askFarm ? farmId : null,
    unitReadOnly: !!employeeFarms,
    create,
    update,
    onSaved,
  });

  const missingProducer = askProducer && !producerId;
  const missingFarm = askFarm && !farmId;
  const reportInvalid = (fieldErrors: FieldErrors<InputFormInput>) => {
    if (missingProducer) setProducerError(REQUIRED_FIELD_MESSAGE);
    if (missingFarm) setFarmError(REQUIRED_FIELD_MESSAGE);
    const missing =
      missingProducer ||
      missingFarm ||
      Object.values(fieldErrors).some(
        (error) => error?.message === REQUIRED_FIELD_MESSAGE,
      );
    submission.setSummary(missing ? MISSING_FIELDS_MESSAGE : undefined);
  };
  const submitValid = (values: InputFormValues) =>
    missingProducer || missingFarm
      ? reportInvalid({})
      : submission.submit(values);

  // El existente lo dice el servidor; si el aviso salió antes de enviar, se busca en la lista.
  const existing: ExistingInput | undefined =
    errors.name?.message === DUPLICATE_INPUT_MESSAGE
      ? (submission.existing ??
        findDuplicateInput(others, {
          name: form.getValues('name'),
          input_type: form.getValues('input_type'),
        }))
      : undefined;

  const activateExisting = async (target: ExistingInput) => {
    const known = catalog.find((candidate) => candidate.id === target.id);
    if (!known || (await submission.activate(known))) onShowExisting(target);
  };

  return (
    <FormDialog
      description={
        input
          ? 'El cambio se ve en todas las pantallas que ofrecen este insumo.'
          : 'Queda disponible para elegirlo al registrar labores y controles.'
      }
      error={submission.summary}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={(event) => {
        void form.handleSubmit(submitValid, reportInvalid)(event);
      }}
      submitLabel={input ? 'Guardar cambios' : 'Registrar insumo'}
      title={input ? `Editar ${input.name}` : 'Registrar insumo'}
    >
      {askProducer && (
        <div>
          <ProducerFilter
            label="Productor"
            onClear={() => setProducerId(null)}
            onSelect={(id) => {
              setProducerId(id);
              setProducerError(undefined);
            }}
            producer={producerId ?? undefined}
            selected={selectedProducer}
          />
          {producerError && (
            <p className="mt-1 text-sm font-bold text-err">{producerError}</p>
          )}
        </div>
      )}
      {askFarm && (
        <SelectField
          disabled={isSaving}
          error={farmError}
          hint="El insumo queda en esta finca; a las otras lo traes con una entrada."
          label="Finca"
          onChange={(event) => {
            setFarmId(event.target.value || null);
            setFarmError(undefined);
          }}
          value={farmId ?? ''}
        >
          <option value="">Elige una finca</option>
          {employeeFarms
            ?.filter((choice) => choice.is_active)
            .map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.name}
              </option>
            ))}
        </SelectField>
      )}
      <InputFormFields
        disabled={isSaving}
        errors={errors}
        extra={
          existing && (
            <DuplicateNotice
              active={existing.is_active}
              disabled={isSaving}
              inactiveText={`${existing.name} está inactivo.`}
              onActivate={() => void activateExisting(existing)}
              onShow={() => onShowExisting(existing)}
              showLabel="Ver el insumo existente"
            />
          )
        }
        form={form}
        unitLocked={submission.unitLocked}
        unitLockedHint={
          employeeFarms && input && !input.has_records
            ? 'Solo el productor cambia la unidad de un insumo.'
            : undefined
        }
      />
    </FormDialog>
  );
}
