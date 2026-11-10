'use client';

import { ChevronRight, FileText } from 'lucide-react';
import Link from 'next/link';

import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import { STRETCHED_LINK_CLASS } from '@/components/stretched-link-class';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { buyerTypeLabel } from '@/lib/buyer-types';
import { formatAbbreviatedDate } from '@/lib/format/dates';
import { formatPesos } from '@/lib/format/pesos';
import { farmLabel } from '@/lib/format/place-label';
import { kilosText } from '@/lib/stock-quantity';

import type { SaleListItem } from '../api';
import { SaleStatusBadge } from './sale-status-badge';

// Las ventas del mes. Toda la fila abre la ficha, donde están las acciones: el número es el enlace y
// se estira sobre la fila (también en la tarjeta de celular). En celular, el número y el estado
// arriba, el comprador en medio y los kilos y el total abajo.
export function SaleTable({
  sales,
  detailHref,
}: {
  sales: readonly SaleListItem[];
  detailHref: (id: string) => string;
}) {
  return (
    <Table
      aria-label="Ventas"
      className={`${COMPACT_TABLE_CLASS} [&_tbody_tr]:relative [&_tbody_tr]:has-[a:focus-visible]:outline-3 [&_tbody_tr]:has-[a:focus-visible]:outline-cobre`}
    >
      <TableHeader>
        <TableRow>
          <TableHead>Venta</TableHead>
          <TableHead>Comprador</TableHead>
          <TableHead>Finca</TableHead>
          <TableHead className="text-right">G1</TableHead>
          <TableHead className="text-right">G2</TableHead>
          <TableHead className="text-right">Valor total</TableHead>
          <TableHead>
            <span className="sr-only">Soporte</span>
          </TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => {
          const voided = sale.status === 'voided';
          return (
            <TableRow key={sale.id}>
              <TableCell className="max-md:order-1 max-md:col-span-1!">
                <Link
                  className={`font-mono font-bold text-selva hover:underline ${STRETCHED_LINK_CLASS}`}
                  href={detailHref(sale.id)}
                >
                  {sale.code}
                </Link>
                <span className="block text-sm text-muted-foreground">
                  {formatAbbreviatedDate(sale.sale_date)}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground md:hidden"
                />
              </TableCell>
              <TableCell className="whitespace-normal max-md:order-3">
                <span className="block font-bold">{sale.buyer.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {buyerTypeLabel(sale.buyer.buyer_type)}
                </span>
              </TableCell>
              <TableCell className="whitespace-normal max-md:order-4 max-md:text-muted-foreground">
                {farmLabel(sale.farm)}
              </TableCell>
              <TableCell className="text-right tabular-nums max-md:order-5 max-md:col-span-1! max-md:text-left">
                <span className="md:hidden">G1 </span>
                {kilosText(sale.g1_kg)} kg
              </TableCell>
              <TableCell className="text-right tabular-nums max-md:order-6 max-md:col-span-1! max-md:justify-self-end">
                <span className="md:hidden">G2 </span>
                {kilosText(sale.g2_kg)} kg
              </TableCell>
              <TableCell
                className={`text-right font-bold tabular-nums max-md:order-7 max-md:text-left max-md:text-base ${voided ? 'text-muted-foreground line-through' : ''}`}
              >
                {formatPesos(sale.total)}
              </TableCell>
              <TableCell className="max-md:order-8 max-md:text-muted-foreground">
                {sale.invoice && (
                  <span className="inline-flex items-center gap-1">
                    <FileText aria-hidden="true" className="size-4" />
                    <span className="sr-only">Con soporte de la factura</span>
                    <span aria-hidden="true" className="text-sm md:hidden">
                      Con soporte
                    </span>
                  </span>
                )}
              </TableCell>
              <TableCell className="max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
                <SaleStatusBadge status={sale.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
