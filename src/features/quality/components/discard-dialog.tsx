'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ban } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { StatusChangeDialog } from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';

import { type LotQuality, useDiscardLot } from '../api';
import {
  DISCARD_CONFIRM_DESCRIPTION,
  discardConfirmTitle,
  type DiscardFormInput,
  discardFormSchema,
  emptyDiscardForm,
  toDiscardRequest,
} from '../discard-form';
import { lotBrief } from '../quality-card-facts';
import { qualityFailureOf } from '../quality-errors';
import { DiscardReasonFields } from './discard-reason-fields';

export const LOT_DISCARDED = 'Lote descartado.';

// Descartar un lote Evaluado completo, con su motivo. Es irreversible: «Descartar» pide confirmar,
// y Cancelar vuelve al formulario sin cambiar nada. Sin motivo no se llega a la confirmación.
export function DiscardDialog({
  lot,
  onClose,
  onSaved,
  onStatusChanged,
}: {
  lot: LotQuality;
  onClose: () => void;
  onSaved: (message: string) => void;
  onStatusChanged: (message: string) => void;
}) {
  const form = useForm<DiscardFormInput>({
    resolver: zodResolver(discardFormSchema),
    defaultValues: emptyDiscardForm(),
  });
  const { errors } = form.formState;
  const reason = useWatch({ control: form.control, name: 'reason' });
  const discard = useDiscardLot(lot.lot.id);
  const [confirming, setConfirming] = useState<DiscardFormInput>();

  const confirm = useConfirmAction(
    async () => {
      try {
        await discard.mutateAsync(
          toDiscardRequest(confirming!, lot.lot.version),
        );
      } catch (error) {
        const failure = qualityFailureOf(error, 'descartar');
        if (failure.kind !== 'status') throw error;
        onStatusChanged(failure.message);
        return;
      }
      onSaved(LOT_DISCARDED);
    },
    (error) => qualityFailureOf(error, 'descartar').message,
    {
      open: confirming !== undefined,
      onOpenChange: (open) => {
        if (!open) setConfirming(undefined);
      },
    },
  );

  return (
    <>
      <FormDialog
        contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
        description={lotBrief(lot)}
        destructive
        isSaving={false}
        onClose={onClose}
        onSubmit={(event) => void form.handleSubmit(setConfirming)(event)}
        submitLabel="Descartar"
        title={`Descartar lote · ${lot.lot.code}`}
      >
        <DiscardReasonFields
          detailProps={{
            error: errors.detail?.message,
            ...form.register('detail'),
          }}
          optionalDetail
          reason={reason}
          reasonProps={{
            error: errors.reason?.message,
            ...form.register('reason'),
          }}
        />
      </FormDialog>
      <StatusChangeDialog
        {...confirm}
        action={{
          trigger: 'Descartar lote',
          title: discardConfirmTitle(lot.lot.code),
          description: DISCARD_CONFIRM_DESCRIPTION,
          confirm: 'Descartar lote',
          pending: 'Descartando…',
          Icon: Ban,
          variant: 'destructive',
        }}
      />
    </>
  );
}
