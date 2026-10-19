'use client';

import { Package } from 'lucide-react';
import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { OccupyingLot } from '../facility-errors';
import { occupiedText } from '../facility-messages';

// Lo que queda del diálogo de desactivar o eliminar cuando un lote ocupó el elemento entre que se
// cargó la lista y se confirmó. Ya no hay nada que confirmar: solo cerrar o ir al lote.
export function FacilityOccupiedDialog({
  title,
  verb,
  lot,
  lotHref,
  onClose,
}: {
  title: string;
  verb: 'desactivar' | 'eliminar';
  lot: OccupyingLot;
  // Sin él (quien no puede ver lotes) no se ofrece ir al lote.
  lotHref?: (id: string) => string;
  onClose: () => void;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{occupiedText(lot.code, verb)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cerrar
          </DialogClose>
          {lotHref && (
            <Link className={buttonVariants()} href={lotHref(lot.id)}>
              <Package aria-hidden="true" className="size-4" /> Ver el lote
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
