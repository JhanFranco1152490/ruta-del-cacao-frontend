'use client';

import { ChevronRight } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

import {
  COMPACT_TABLE_CLASS,
  ROW_LINK_CLASS,
} from '@/components/compact-table-class';
import { StatusBadge } from '@/components/status-badge';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { producerLabelOf } from '@/lib/format/producer';

import type { Buyer } from '../api';
import { contactMeansText, documentText } from '../buyer-format';
import { buyerTypeLabel } from '../buyer-types';

const rowId = (id: string) => `comprador-${id}`;

// En celular cada fila es una tarjeta: el nombre y su estado arriba, el documento y el tipo debajo
// y el contacto al final. Tocarla abre la hoja del comprador, con sus acciones; en escritorio la
// fila elegida se resalta y las acciones van al final.
export function BuyerTable({
  buyers,
  selectedId,
  showProducer,
  onSelect,
  renderActions,
}: {
  buyers: readonly Buyer[];
  selectedId: string | null;
  // La cuenta técnica sin productor elegido ve los de todos.
  showProducer: boolean;
  onSelect: (id: string) => void;
  renderActions: (buyer: Buyer) => ReactNode;
}) {
  // Quien llega con un comprador en la dirección («Ver el comprador») lo encuentra a la vista.
  useEffect(() => {
    if (!selectedId) return;
    document
      .getElementById(rowId(selectedId))
      ?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  return (
    <Table aria-label="Compradores" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Comprador</TableHead>
          {showProducer && <TableHead>Productor</TableHead>}
          <TableHead>Tipo de cliente</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {buyers.map((buyer) => (
          <TableRow
            data-state={buyer.id === selectedId ? 'selected' : undefined}
            id={rowId(buyer.id)}
            key={buyer.id}
          >
            <TableCell className="max-md:order-1 max-md:col-span-1!">
              <p className="font-bold text-selva">{buyer.name}</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {documentText(buyer)}
              </p>
              <button
                aria-label={`Ver ${buyer.name}`}
                className={`${ROW_LINK_CLASS} flex items-center md:hidden ${FOCUS_OUTLINE_CLASS}`}
                onClick={() => onSelect(buyer.id)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </button>
            </TableCell>
            {showProducer && (
              <TableCell className="text-sm max-md:order-5">
                {producerLabelOf(buyer.producer)}
              </TableCell>
            )}
            <TableCell className="max-md:order-3">
              {buyerTypeLabel(buyer.buyer_type)}
            </TableCell>
            <TableCell className="max-md:order-4">
              {buyer.contact_name && <p>{buyer.contact_name}</p>}
              <p className="text-sm text-muted-foreground">
                {contactMeansText(buyer)}
              </p>
            </TableCell>
            <TableCell className="max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
              <StatusBadge tone={buyer.is_active ? 'ok' : 'warn'}>
                {buyer.is_active ? 'Activo' : 'Inactivo'}
              </StatusBadge>
            </TableCell>
            <TableCell className="text-right max-md:hidden">
              {renderActions(buyer)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
