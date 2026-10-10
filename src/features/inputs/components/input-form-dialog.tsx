'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { type FieldErrors, useForm } from 'react-hook-form';

import { ProducerFilter } from '@/components/producer-filter';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { InputDuplicateNotice } from './input-duplicate-notice';
import { InputFormFields } from './input-form-fields';
import { useInputSubmit } from './use-input-submit';

// Registrar un insumo, o editar `input` si llega. Se monta al abrirse, así que parte de los
// valores de ese momento y no adopta lecturas posteriores: guardar la versión nueva con valores
// viejos pisaría lo que otra persona cambió.
export function InputFormDialog({
  input,
  catalog,
  producer,
  chooseProducer,
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
    create,
    update,
    onSaved,
  });

  const missingProducer = askProducer && !producerId;
  const reportInvalid = (fieldErrors: FieldErrors<InputFormInput>) => {
    if (missingProducer) setProducerError(REQUIRED_FIELD_MESSAGE);
    const missing =
      missingProducer ||
      Object.values(fieldErrors).some(
        (error) => error?.message === REQUIRED_FIELD_MESSAGE,
      );
    submission.setSummary(missing ? MISSING_FIELDS_MESSAGE : undefined);
  };
  const submitValid = (values: InputFormValues) =>
    missingProducer ? reportInvalid({}) : submission.submit(values);

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
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
      open
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!isSaving}>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            void form.handleSubmit(submitValid, reportInvalid)(event);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {input ? `Editar ${input.name}` : 'Registrar insumo'}
            </DialogTitle>
            <DialogDescription>
              {input
                ? 'El cambio se ve en todas las pantallas que ofrecen este insumo.'
                : 'Queda disponible para elegirlo al registrar labores y controles.'}
            </DialogDescription>
          </DialogHeader>
          {submission.summary && (
            <p className="text-sm font-bold text-err" role="alert">
              {submission.summary}
            </p>
          )}
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
                <p className="mt-1 text-sm font-bold text-err">
                  {producerError}
                </p>
              )}
            </div>
          )}
          <InputFormFields
            disabled={isSaving}
            errors={errors}
            extra={
              existing && (
                <InputDuplicateNotice
                  disabled={isSaving}
                  existing={existing}
                  onActivate={() => void activateExisting(existing)}
                  onShow={() => onShowExisting(existing)}
                />
              )
            }
            form={form}
            unitLocked={submission.unitLocked}
          />
          <DialogFooter>
            <DialogClose
              disabled={isSaving}
              render={<Button variant="outline" />}
            >
              Cancelar
            </DialogClose>
            <SubmitButton
              className="sm:w-auto"
              pending={isSaving}
              pendingLabel="Guardando…"
            >
              {input ? 'Guardar cambios' : 'Registrar insumo'}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
