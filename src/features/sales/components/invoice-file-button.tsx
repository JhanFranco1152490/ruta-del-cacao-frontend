'use client';

import type { LucideIcon } from 'lucide-react';
import { useId, useRef } from 'react';

import { Button } from '@/components/ui/button';

import { INVOICE_ACCEPT } from '../invoice-file';

// Un botón que abre el selector de archivos del soporte. El campo de archivo queda oculto (su
// aspecto no se puede cambiar) pero con su etiqueta para lectores de pantalla.
export function InvoiceFileButton({
  label,
  inputLabel = 'Archivo del soporte',
  icon: Icon,
  disabled,
  title,
  onFile,
}: {
  label: string;
  inputLabel?: string;
  icon?: LucideIcon;
  disabled: boolean;
  // Por qué está deshabilitado, al pasar el mouse.
  title?: string;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <label className="sr-only" htmlFor={inputId}>
        {inputLabel}
      </label>
      <input
        accept={INVOICE_ACCEPT}
        className="sr-only"
        disabled={disabled}
        id={inputId}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          if (chosen) onFile(chosen);
          // Elegir el mismo archivo otra vez también avisa.
          event.target.value = '';
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
      <Button
        disabled={disabled}
        onClick={() => input.current?.click()}
        size="office"
        title={title}
        type="button"
        variant="outline"
      >
        {Icon && <Icon aria-hidden="true" className="size-4" />}
        {label}
      </Button>
    </>
  );
}
