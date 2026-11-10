import Link from 'next/link';

import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { buyerTypeLabel } from '@/lib/buyer-types';
import { formatDateTime } from '@/lib/format/dates';
import { farmLabel } from '@/lib/format/place-label';

import type { Sale } from '../api';

// Los datos de la venta: de qué finca, a quién, quién la registró y, si se anuló, quién, cuándo y
// por qué. El comprador lleva a su hoja en Compradores solo si la cuenta los consulta.
export function SaleFacts({
  sale,
  buyerHref,
}: {
  sale: Sale;
  buyerHref: ((id: string) => string) | null;
}) {
  const { buyer, voided } = sale;
  return (
    <KeyValues>
      <KeyValue label="Finca">{farmLabel(sale.farm)}</KeyValue>
      <KeyValue label="Comprador">
        {buyerHref ? (
          <Link
            className="text-selva underline-offset-2 hover:underline"
            href={buyerHref(buyer.id)}
          >
            {buyer.name}
          </Link>
        ) : (
          buyer.name
        )}
        <span className="block text-sm font-normal text-muted-foreground">
          {buyerTypeLabel(buyer.buyer_type)}
          {!buyer.is_active && ' · Inactivo'}
        </span>
      </KeyValue>
      {sale.notes && <KeyValue label="Observaciones">{sale.notes}</KeyValue>}
      <KeyValue label="Registrada">
        Por {sale.created_by.full_name} el {formatDateTime(sale.created_at)}
      </KeyValue>
      {voided && (
        <>
          <KeyValue label="Anulada">
            Por {voided.voided_by.full_name} el{' '}
            {formatDateTime(voided.voided_at)}
          </KeyValue>
          <KeyValue label="Motivo de la anulación">{voided.reason}</KeyValue>
        </>
      )}
    </KeyValues>
  );
}
