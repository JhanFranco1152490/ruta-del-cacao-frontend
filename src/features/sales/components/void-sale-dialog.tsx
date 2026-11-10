'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { TextAreaField } from '@/components/text-area-field';
import { notify } from '@/lib/notify';

import type { Sale } from '../api';
import { useVoidSale } from '../mutations';
import { saleFailureOf } from '../sale-errors';
import { VOID_REASON_MAX_LENGTH } from '../sale-limits';
import { saleVoided, voidConsequence, voidQuestion } from '../sale-messages';
import { saleKilos, type VoidFormInput, voidFormSchema } from '../void-form';

// Anular una venta con su motivo. No se borra: queda en el historial marcada como anulada, con quién
// y por qué, y sus kilos vuelven a las existencias de bodega. No se deshace: si se anuló por error,
// se registra otra vez.
export function VoidSaleDialog({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
  const form = useForm<VoidFormInput>({
    resolver: zodResolver(voidFormSchema),
    defaultValues: { reason: '' },
  });
  const voidSale = useVoidSale(sale.id);
  const [summary, setSummary] = useState<string>();

  const onError = (error: unknown) => {
    const failure = saleFailureOf(error);
    // Ya estaba anulada: no hay nada que hacer aquí, la ficha se vuelve a leer sola.
    if (failure.kind === 'voided') {
      notify.warning(failure.message);
      onClose();
      return;
    }
    if (failure.kind === 'field') {
      form.setError('reason', { type: 'server', message: failure.message });
      return;
    }
    setSummary(failure.message);
  };

  const submit = (values: VoidFormInput) => {
    setSummary(undefined);
    voidSale.mutate(
      { expected_version: sale.version, reason: values.reason.trim() },
      {
        onSuccess: () => {
          onClose();
          notify.success(saleVoided(sale.code));
        },
        onError,
      },
    );
  };

  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={voidConsequence(saleKilos(sale))}
      destructive
      error={summary}
      isSaving={voidSale.isPending}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      pendingLabel="Anulando…"
      submitLabel="Anular venta"
      title={voidQuestion(sale.code)}
    >
      <TextAreaField
        disabled={voidSale.isPending}
        error={form.formState.errors.reason?.message}
        label="Motivo"
        maxLength={VOID_REASON_MAX_LENGTH}
        rows={3}
        {...form.register('reason')}
      />
    </FormDialog>
  );
}
