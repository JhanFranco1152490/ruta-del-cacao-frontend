'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

// «Imprimir comprobante» en el pie de la ficha. Sirve también sin conexión: el comprobante sale de
// lo que la ficha ya tiene, y no cambia nada de la venta.
export function SalePrintAction({ onPrint }: { onPrint: () => void }) {
  return (
    <Button onClick={onPrint} size="office" variant="outline">
      <Printer aria-hidden="true" className="size-4" /> Imprimir comprobante
    </Button>
  );
}
