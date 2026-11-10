'use client';

import { Ban } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { Sale } from '../api';
import type { SaleOffer } from '../sale-actions';
import { VoidSaleDialog } from './void-sale-dialog';

// «Anular venta» en el pie de la ficha y el diálogo que pide el motivo. El botón del pie no es rojo:
// el rojo queda para el de confirmar, que es el que no se deshace.
export function SaleVoidAction({
  sale,
  offer,
}: {
  sale: Sale;
  offer: SaleOffer;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        disabled={offer.disabledReason !== null}
        onClick={() => setOpen(true)}
        size="office"
        title={offer.disabledReason ?? undefined}
        variant="outline"
      >
        <Ban aria-hidden="true" className="size-4" /> {offer.label}
      </Button>
      {open && <VoidSaleDialog onClose={() => setOpen(false)} sale={sale} />}
    </>
  );
}
