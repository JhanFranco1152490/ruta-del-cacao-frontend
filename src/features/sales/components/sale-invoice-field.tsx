'use client';

import { FileText, X } from 'lucide-react';
import { useId, useRef } from 'react';

import { FormSection } from '@/components/form-section';
import { InlineError } from '@/components/form-message';
import { Button } from '@/components/ui/button';

import { fileSizeText, INVOICE_ACCEPT } from '../invoice-file';

// El soporte de la factura, opcional: un PDF, JPG o PNG que se sube enseguida de registrar la venta.
// No se reduce como una foto: una factura escaneada debe seguir leyéndose.
export function SaleInvoiceField({
  file,
  error,
  disabled,
  onChoose,
  onRemove,
}: {
  file: File | null;
  error?: string;
  disabled: boolean;
  onChoose: (file: File) => void;
  onRemove: () => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <FormSection title="Soporte de la factura (opcional)">
      <div className="mt-4 space-y-3">
        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <p className="flex min-w-0 items-center gap-2">
              <FileText aria-hidden="true" className="size-5 shrink-0" />
              <span className="truncate font-bold">{file.name}</span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {fileSizeText(file.size)}
              </span>
            </p>
            <Button
              aria-label={`Quitar ${file.name}`}
              disabled={disabled}
              onClick={onRemove}
              size="office"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            PDF, JPG o PNG de hasta 5 MB. También puedes adjuntarlo después,
            desde la venta.
          </p>
        )}
        <label className="sr-only" htmlFor={inputId}>
          Archivo del soporte
        </label>
        <input
          accept={INVOICE_ACCEPT}
          className="sr-only"
          disabled={disabled}
          id={inputId}
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) onChoose(chosen);
            // Elegir el mismo archivo otra vez también avisa.
            event.target.value = '';
          }}
          ref={input}
          type="file"
        />
        <Button
          disabled={disabled}
          onClick={() => input.current?.click()}
          size="office"
          type="button"
          variant="outline"
        >
          {file ? 'Cambiar archivo' : 'Elegir archivo'}
        </Button>
        <InlineError>{error}</InlineError>
      </div>
    </FormSection>
  );
}
