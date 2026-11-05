'use client';

import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/query-keys';
import { notify } from '@/lib/notify';
import type { QualityAction } from '@/lib/paths/quality';

import type { LotQuality } from '../api';
import { EvaluationDialog, NO_CHANGES } from './evaluation-dialog';

export type OpenQualityAction = { lot: LotQuality; action: QualityAction };

// El formulario de la acción elegida sobre un lote. Al guardar se avisa; si el lote cambió de
// estado entretanto, se avisa por qué y la lista se vuelve a leer.
export function QualityActionDialog({
  open,
  onClose,
}: {
  open: OpenQualityAction;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const saved = (message: string) => {
    if (message === NO_CHANGES) notify.info(message);
    else notify.success(message);
    onClose();
  };
  const statusChanged = (message: string) => {
    notify.warning(message);
    void queryClient.invalidateQueries({ queryKey: queryKeys.quality.all() });
    onClose();
  };

  switch (open.action) {
    case 'evaluar':
    case 'corregir':
      return (
        <EvaluationDialog
          correcting={open.action === 'corregir'}
          lot={open.lot}
          onClose={onClose}
          onSaved={saved}
          onStatusChanged={statusChanged}
        />
      );
    default:
      return null;
  }
}
