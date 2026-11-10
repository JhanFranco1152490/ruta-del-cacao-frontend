'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { type FieldErrors, useForm, useWatch } from 'react-hook-form';

import { DuplicateNotice } from '@/components/duplicate-notice';
import { FormDialog } from '@/components/form-dialog';
import { InlineError } from '@/components/form-message';
import { ProducerFilter } from '@/components/producer-filter';
import { Button } from '@/components/ui/button';
import { useProducerSummary } from '@/lib/api/producer-options';
import {
  MISSING_FIELDS_MESSAGE,
  REQUIRED_FIELD_MESSAGE,
} from '@/lib/validation/messages';

import type { Buyer, ExistingBuyer } from '../api';
import { sameNameBuyer } from '../buyer-duplicates';
import { emptyBuyerForm, toFormValues } from '../buyer-form-values';
import { BUYER_FORM_HINT, SIMILAR_NAME_MESSAGE } from '../buyer-messages';
import {
  buyerFormSchema,
  type BuyerFormInput,
  type BuyerFormValues,
} from '../buyer-schema';
import { useBuyerSubmit } from '../use-buyer-submit';
import { BuyerFormFields } from './buyer-form-fields';

// Registrar un comprador, o editar `buyer` si llega. Se monta al abrirse, así que parte de los
// valores de ese momento y no adopta lecturas posteriores: guardar la versión nueva con valores
// viejos pisaría lo que otra persona cambió.
export function BuyerFormDialog({
  buyer,
  known,
  producer,
  chooseProducer,
  onClose,
  onSaved,
  onShowExisting,
}: {
  buyer?: Buyer;
  // El directorio que se ve, para avisar de un nombre o un documento repetido antes de enviar.
  known: readonly Buyer[];
  // El productor elegido en la lista: con él empieza el formulario de la cuenta técnica.
  producer: string | null;
  // Solo la cuenta técnica elige de qué productor es el comprador nuevo.
  chooseProducer: boolean;
  onClose: () => void;
  onSaved: (message: string | null) => void;
  onShowExisting: (id: string) => void;
}) {
  const askProducer = chooseProducer && !buyer;
  const form = useForm<BuyerFormInput, unknown, BuyerFormValues>({
    resolver: zodResolver(buyerFormSchema({ needsProducer: askProducer })),
    defaultValues: buyer
      ? toFormValues(buyer)
      : { ...emptyBuyerForm, producer_id: askProducer ? (producer ?? '') : '' },
  });
  const { errors } = form.formState;
  const producerId = useWatch({ control: form.control, name: 'producer_id' });
  const name = useWatch({ control: form.control, name: 'name' });
  const selectedProducer = useProducerSummary(
    askProducer ? producerId || undefined : undefined,
  );
  // Los documentos y los nombres se comparan dentro del directorio del productor del comprador.
  const ownerId = buyer?.producer.id ?? (askProducer ? producerId : '');
  const sameOwner = useMemo(
    () =>
      ownerId ? known.filter((other) => other.producer.id === ownerId) : known,
    [known, ownerId],
  );
  const submission = useBuyerSubmit({
    buyer,
    form,
    known: sameOwner,
    onSaved,
  });
  const { isSaving } = submission;

  const reportInvalid = (fieldErrors: FieldErrors<BuyerFormInput>) => {
    const missing = Object.values(fieldErrors).some(
      (error) => error?.message === REQUIRED_FIELD_MESSAGE,
    );
    submission.setSummary(missing ? MISSING_FIELDS_MESSAGE : undefined);
  };

  const existing =
    errors.identity_document?.type === 'server'
      ? submission.existing
      : undefined;
  const similar = existing
    ? null
    : sameNameBuyer(sameOwner, name, submission.current?.id);
  const activateExisting = async (target: ExistingBuyer) => {
    const found = known.find((candidate) => candidate.id === target.id);
    if (found && (await submission.activate(found))) onShowExisting(found.id);
  };

  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={buyer ? undefined : BUYER_FORM_HINT}
      // Al editar, cancelar con cambios pregunta antes de perderlos.
      dirty={!!buyer && form.formState.isDirty}
      error={submission.summary}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={(event) => {
        void form.handleSubmit(submission.submit, reportInvalid)(event);
      }}
      submitLabel={buyer ? 'Guardar cambios' : 'Guardar'}
      title={buyer ? 'Editar comprador' : 'Registrar comprador'}
    >
      {askProducer && (
        <div className="space-y-1">
          <ProducerFilter
            onClear={() => form.setValue('producer_id', '')}
            onSelect={(id) =>
              form.setValue('producer_id', id, { shouldValidate: true })
            }
            producer={producerId || undefined}
            selected={selectedProducer}
          />
          <InlineError>{errors.producer_id?.message}</InlineError>
        </div>
      )}
      <BuyerFormFields
        disabled={isSaving}
        documentNotice={
          existing && (
            <DuplicateNotice
              active={existing.is_active}
              disabled={isSaving}
              inactiveText="Puedes activarlo en vez de registrarlo de nuevo."
              onActivate={() => void activateExisting(existing)}
              onShow={() => onShowExisting(existing.id)}
              showLabel="Ver el comprador"
            />
          )
        }
        form={form}
        nameNotice={
          similar && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>{SIMILAR_NAME_MESSAGE}</span>
              <Button
                disabled={isSaving}
                onClick={() => onShowExisting(similar.id)}
                type="button"
                variant="link"
              >
                Ver el comprador
              </Button>
            </div>
          )
        }
      />
    </FormDialog>
  );
}
