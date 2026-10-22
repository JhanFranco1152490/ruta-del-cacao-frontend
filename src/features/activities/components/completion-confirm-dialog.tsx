'use client';

import { SaveConfirmDialog } from '@/components/save-confirm-dialog';

// Una realización no se corrige después de guardada: antes de guardarla se dice, con todas sus
// letras, qué se va a registrar.
export function CompletionConfirmDialog({
  summary,
  confirmLabel,
  isSaving,
  error,
  onConfirm,
  onBack,
}: {
  summary: string;
  // Lo que va a pasar al confirmar: "Guardar" o "Guardar en el teléfono".
  confirmLabel: string;
  isSaving: boolean;
  error?: string | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <SaveConfirmDialog
      confirmLabel={confirmLabel}
      error={error}
      isSaving={isSaving}
      onBack={onBack}
      onConfirm={onConfirm}
      summary={summary}
      title="Confirma la realización"
    />
  );
}
