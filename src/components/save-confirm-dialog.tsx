'use client';

import type { ReactNode } from 'react';

import { InlineError } from '@/components/form-message';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Lo que no se corrige después de guardado se confirma antes: qué se va a registrar, con todas sus
// letras. «Volver» regresa al formulario sin perder nada.
export function SaveConfirmDialog({
  title,
  summary,
  summaryClassName = 'text-base text-foreground',
  confirmLabel,
  isSaving,
  error,
  onConfirm,
  onBack,
  children,
}: {
  title: string;
  summary: ReactNode;
  summaryClassName?: string;
  // Lo que va a pasar al confirmar, p. ej. "Guardar" o "Guardar en el teléfono".
  confirmLabel: string;
  isSaving: boolean;
  error?: string | null;
  onConfirm: () => void;
  onBack: () => void;
  children?: ReactNode;
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={summaryClassName}>
            {summary}
          </DialogDescription>
        </DialogHeader>
        {children}
        <InlineError>{error}</InlineError>
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
