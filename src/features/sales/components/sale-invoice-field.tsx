'use client';

import { X } from 'lucide-react';

import { FormSection } from '@/components/form-section';
import { InlineError } from '@/components/form-message';
import { Button } from '@/components/ui/button';

import { InvoiceFileButton } from './invoice-file-button';
import { InvoiceFileSummary } from './invoice-file-summary';

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
  return (
    <FormSection title="Soporte de la factura (opcional)">
      <div className="mt-4 space-y-3">
        {file ? (
          <InvoiceFileSummary name={file.name} size={file.size}>
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
          </InvoiceFileSummary>
        ) : (
          <p className="text-sm text-muted-foreground">
            PDF, JPG o PNG de hasta 5 MB. También puedes adjuntarlo después,
            desde la venta.
          </p>
        )}
        <InvoiceFileButton
          disabled={disabled}
          label={file ? 'Cambiar archivo' : 'Elegir archivo'}
          onFile={onChoose}
        />
        <InlineError>{error}</InlineError>
      </div>
    </FormSection>
  );
}
