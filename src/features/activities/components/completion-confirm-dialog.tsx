'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isSaving) onBack();
      }}
      open
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!isSaving}>
        <DialogHeader>
          <DialogTitle>Confirma la realización</DialogTitle>
          <DialogDescription className="text-base text-foreground">
            {summary}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm font-bold text-err" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button disabled={isSaving} onClick={onBack} variant="outline">
            Volver
          </Button>
          <Button disabled={isSaving} onClick={onConfirm}>
            {isSaving ? 'Guardando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
