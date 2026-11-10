'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { getErrorMessage } from '@/lib/api/errors';
import { serverErrorSummary } from '@/lib/api/form-errors';

import type { Buyer, ExistingBuyer } from './api';
import { sameDocumentBuyer } from './buyer-duplicates';
import {
  currentBuyerOf,
  duplicateBuyerOf,
  isProducerInactive,
} from './buyer-errors';
import {
  toCreateRequest,
  toFormValues,
  toUpdateRequest,
} from './buyer-form-values';
import {
  BUYER_ACTIVATED_MESSAGE,
  BUYER_CREATED_MESSAGE,
  BUYER_UPDATED_MESSAGE,
  duplicateDocumentMessage,
  SAVE_FAILED_MESSAGE,
  STALE_BUYER_MESSAGE,
} from './buyer-messages';
import {
  BUYER_FORM_FIELDS,
  type BuyerFormInput,
  type BuyerFormValues,
} from './buyer-schema';
import { useCreateBuyer, useUpdateBuyer } from './mutations';

const PRODUCER_INACTIVE_MESSAGE =
  'El productor está inactivo: actívalo antes de registrarle compradores.';

// Envía el formulario de un comprador y traduce cada respuesta de error a lo que ve la persona. Ante
// cualquier error el formulario conserva lo escrito, salvo con una versión obsoleta: ahí carga los
// valores vigentes, porque guardar sobre ellos sin verlos pisaría el cambio de otra persona.
export function useBuyerSubmit({
  buyer,
  form,
  known,
  onSaved,
}: {
  buyer?: Buyer;
  form: UseFormReturn<BuyerFormInput, unknown, BuyerFormValues>;
  // Los del mismo productor, para adelantarse al documento repetido.
  known: readonly Buyer[];
  // El comprador que quedó guardado, para quien lo necesita enseguida (elegirlo en una venta).
  onSaved: (message: string | null, saved?: Buyer) => void;
}) {
  const create = useCreateBuyer();
  const update = useUpdateBuyer();
  const [summary, setSummary] = useState<string>();
  const [existing, setExisting] = useState<ExistingBuyer>();
  const [current, setCurrent] = useState(buyer);

  const markDuplicate = (duplicate: ExistingBuyer) => {
    setExisting(duplicate);
    form.setError('identity_document', {
      type: 'server',
      message: duplicateDocumentMessage(duplicate.name, duplicate.is_active),
    });
  };

  const showError = (error: unknown) => {
    const duplicate = duplicateBuyerOf(error);
    if (duplicate) return markDuplicate(duplicate);
    const latest = currentBuyerOf(error);
    if (latest) {
      setCurrent(latest);
      form.reset(toFormValues(latest));
      setSummary(STALE_BUYER_MESSAGE);
      return;
    }
    if (isProducerInactive(error)) {
      setSummary(PRODUCER_INACTIVE_MESSAGE);
      return;
    }
    setSummary(
      serverErrorSummary(
        error,
        form.setError,
        BUYER_FORM_FIELDS,
        SAVE_FAILED_MESSAGE,
      ),
    );
  };

  const submit = async (values: BuyerFormValues) => {
    setSummary(undefined);
    setExisting(undefined);
    // La copia de la lista ya dice si el documento está tomado: no hace falta preguntar.
    const repeated = sameDocumentBuyer(
      known,
      values.document_type,
      values.identity_document,
      current?.id,
    );
    if (repeated) return markDuplicate(repeated);
    try {
      if (current) {
        const changes = toUpdateRequest(values, current);
        // Sin cambios no hay nada que guardar ni que avisar.
        if (!changes) return onSaved(null);
        const updated = await update.mutateAsync({
          id: current.id,
          body: changes,
        });
        onSaved(BUYER_UPDATED_MESSAGE, updated);
      } else {
        const created = await create.mutateAsync(toCreateRequest(values));
        onSaved(BUYER_CREATED_MESSAGE, created);
      }
    } catch (error) {
      showError(error);
    }
  };

  // Activa el comprador inactivo que ya tiene el documento. Devuelve si lo logró.
  const activate = async (target: Buyer) => {
    setSummary(undefined);
    try {
      const activated = await update.mutateAsync({
        id: target.id,
        body: { is_active: true, expected_version: target.version },
      });
      onSaved(BUYER_ACTIVATED_MESSAGE, activated);
      return true;
    } catch (error) {
      setSummary(
        getErrorMessage(error, 'No fue posible activar el comprador.'),
      );
      return false;
    }
  };

  return {
    submit,
    activate,
    summary,
    setSummary,
    existing,
    current,
    isSaving: create.isPending || update.isPending,
  };
}
