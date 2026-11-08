'use client';

import type { ReactNode } from 'react';

import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { StatusBadge } from '@/components/status-badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { producerLabelOf } from '@/lib/format/producer';

import type { Buyer } from '../api';
import { contactMeansText, documentText } from '../buyer-format';
import { buyerTypeLabel } from '../buyer-types';

// En celular, tocar la tarjeta de un comprador abre esta hoja con sus datos y sus acciones. No hay
// pantalla de detalle: el comprador tiene pocos datos y todos caben aquí.
export function BuyerSheet({
  buyer,
  showProducer,
  actions,
  onClose,
}: {
  buyer: Buyer;
  showProducer: boolean;
  actions?: ReactNode;
  onClose: () => void;
}) {
  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{buyer.name}</SheetTitle>
          <SheetDescription>{documentText(buyer)}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <KeyValues single>
            {showProducer && (
              <KeyValue label="Productor">
                {producerLabelOf(buyer.producer)}
              </KeyValue>
            )}
            <KeyValue label="Tipo de cliente">
              {buyerTypeLabel(buyer.buyer_type)}
            </KeyValue>
            {buyer.contact_name && (
              <KeyValue label="Persona de contacto">
                {buyer.contact_name}
              </KeyValue>
            )}
            <KeyValue label="Teléfono y correo">
              {contactMeansText(buyer)}
            </KeyValue>
            <KeyValue label="Estado">
              <StatusBadge tone={buyer.is_active ? 'ok' : 'warn'}>
                {buyer.is_active ? 'Activo' : 'Inactivo'}
              </StatusBadge>
            </KeyValue>
          </KeyValues>
        </div>
        {actions && (
          <div className="flex flex-col gap-2 px-4 pb-4">{actions}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
