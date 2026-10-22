import type { FormEventHandler, ReactNode } from 'react';

import { InlineError } from '@/components/form-message';
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

type FormDialogFormProps = {
  title: ReactNode;
  description?: ReactNode;
  // Mientras guarda no se cancela: lo enviado ya está en camino.
  isSaving: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  // Por qué no se guardó: arriba, lo primero que se lee y se anuncia.
  error?: ReactNode;
  submitLabel: ReactNode;
  pendingLabel?: string;
  children: ReactNode;
};

// El formulario de un diálogo: título, campos, el error del envío y el pie con Cancelar y
// Guardar. Sin validación nativa del navegador: la hace el esquema y la muestra cada campo.
export function FormDialogForm({
  title,
  description,
  isSaving,
  onSubmit,
  error,
  submitLabel,
  pendingLabel = 'Guardando…',
  children,
}: FormDialogFormProps) {
  return (
    <form className="space-y-4" noValidate onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <InlineError>{error}</InlineError>
      {children}
      <DialogFooter>
        <DialogClose disabled={isSaving} render={<Button variant="outline" />}>
          Cancelar
        </DialogClose>
        {/* sm:w-auto: el pie va en fila desde `sm` y, a todo el ancho, empujaba a Cancelar fuera
            del diálogo. */}
        <SubmitButton
          className="sm:w-auto"
          pending={isSaving}
          pendingLabel={pendingLabel}
        >
          {submitLabel}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

// Un diálogo que ya está abierto mientras se monta y se cierra con `onClose`, salvo mientras
// guarda.
export function FormDialog({
  onClose,
  contentClassName = 'sm:max-w-lg',
  ...form
}: FormDialogFormProps & {
  onClose: () => void;
  contentClassName?: string;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !form.isSaving) onClose();
      }}
      open
    >
      <DialogContent
        className={contentClassName}
        showCloseButton={!form.isSaving}
      >
        <FormDialogForm {...form} />
      </DialogContent>
    </Dialog>
  );
}
