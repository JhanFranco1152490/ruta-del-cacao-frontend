import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';

import { fileSizeText } from '../invoice-file';

// El archivo del soporte en una fila: su nombre y su tamaño, y a la derecha lo que se puede hacer
// con él.
export function InvoiceFileSummary({
  name,
  size,
  children,
}: {
  name: string;
  size: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
      <p className="flex min-w-0 items-center gap-2">
        <FileText aria-hidden="true" className="size-5 shrink-0" />
        <span className="truncate font-bold">{name}</span>
        <span className="shrink-0 text-sm text-muted-foreground">
          {fileSizeText(size)}
        </span>
      </p>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
