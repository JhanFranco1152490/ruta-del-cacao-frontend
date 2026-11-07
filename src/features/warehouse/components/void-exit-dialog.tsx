'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { TextAreaField } from '@/components/text-area-field';

import type { StockExit } from '../api';
import { DETAIL_MAX_LENGTH } from '../exit-reasons';
import { useVoidExit } from '../mutations';
import {
  EXIT_VOIDED,
  VOID_CONSEQUENCE,
  type VoidFormInput,
  voidFormSchema,
  voidQuestion,
} from '../void-form';
import { warehouseFailureOf } from '../warehouse-errors';

// Anular una salida registrada por error, con su motivo. No se borra: queda en el historial del
// lote, tachada y con quién la anuló, y sus kilos vuelven a las existencias.
export function VoidExitDialog({
  lotId,
  exit,
  onClose,
  onSaved,
  onStatusChanged,
}: {
  lotId: string;
  exit: StockExit;
  onClose: () => void;
  onSaved: (message: string) => void;
  onStatusChanged: (message: string) => void;
}) {
  const form = useForm<VoidFormInput>({
    resolver: zodResolver(voidFormSchema),
    defaultValues: { reason: '' },
  });
  const voidExit = useVoidExit(lotId);
  const [summary, setSummary] = useState<string>();

  const onError = (error: unknown) => {
    const failure = warehouseFailureOf(error, 'void');
    if (failure.kind === 'status') return onStatusChanged(failure.message);
    if (failure.kind === 'field') {
      form.setError('reason', { type: 'server', message: failure.message });
      return;
    }
    setSummary(failure.message);
  };

  const submit = (values: VoidFormInput) => {
    setSummary(undefined);
    voidExit.mutate(
      { exitId: exit.id, reason: values.reason.trim() },
      { onSuccess: () => onSaved(EXIT_VOIDED), onError },
    );
  };

  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={VOID_CONSEQUENCE}
      destructive
      error={summary}
      isSaving={voidExit.isPending}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      pendingLabel="Anulando…"
      submitLabel="Anular salida"
      title={voidQuestion(exit)}
    >
      <TextAreaField
        disabled={voidExit.isPending}
        error={form.formState.errors.reason?.message}
        label="Motivo de la anulación"
        maxLength={DETAIL_MAX_LENGTH}
        rows={3}
        {...form.register('reason')}
      />
    </FormDialog>
  );
}
