import { buyerTypeLabel } from '@/lib/buyer-types';
import { formatDateTime, formatLongDate } from '@/lib/format/dates';
import { farmLabel } from '@/lib/format/place-label';
import { formatPesos } from '@/lib/format/pesos';
import { GRADE_LABELS, kilosText } from '@/lib/stock-quantity';

import type { Sale } from '../api';

// El comprobante de una venta, para el papel o para guardarlo como PDF. Es un resumen de lo que
// quedó registrado y no una factura: la factura electrónica la expide el sistema de facturación del
// productor, y su soporte se adjunta aparte. Solo se ve al imprimir.
export function SaleReceiptDocument({ sale }: { sale: Sale }) {
  const { buyer, voided } = sale;
  return (
    <article
      aria-label={`Comprobante de la venta ${sale.code}`}
      className="hidden space-y-5 bg-white p-6 text-black print:block"
    >
      <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div>
          <p className="text-sm font-bold tracking-widest uppercase">
            Ruta del Cacao
          </p>
          <h1 className="text-3xl font-bold">Comprobante de venta</h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold">{sale.code}</p>
          <p>{formatLongDate(sale.sale_date)}</p>
        </div>
      </header>

      {voided && (
        <p className="border-2 border-black p-2 text-center text-xl font-bold uppercase">
          Venta anulada
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <dt className="text-sm font-bold uppercase">Finca</dt>
          <dd>{farmLabel(sale.farm)}</dd>
        </div>
        <div>
          <dt className="text-sm font-bold uppercase">Comprador</dt>
          <dd>
            {buyer.name}
            <span className="block text-sm">
              {buyerTypeLabel(buyer.buyer_type)}
            </span>
          </dd>
        </div>
      </dl>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y-2 border-black">
            <th className="py-2">Lote</th>
            <th className="py-2">Calibre</th>
            <th className="py-2 text-right">Kilos</th>
            <th className="py-2 text-right">Precio por kilo</th>
            <th className="py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {sale.lines.map((line) => (
            <tr className="border-b border-black/40" key={line.id}>
              <td className="py-2 font-mono text-sm">{line.lot.code}</td>
              <td className="py-2">{GRADE_LABELS[line.grade]}</td>
              <td className="py-2 text-right tabular-nums">
                {kilosText(line.quantity_kg)} kg
              </td>
              <td className="py-2 text-right tabular-nums">
                {formatPesos(line.price_per_kg)}
              </td>
              <td className="py-2 text-right tabular-nums">
                {formatPesos(line.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black text-lg font-bold">
            <td className="py-2" colSpan={2}>
              Valor total
            </td>
            <td className="py-2 text-right tabular-nums" colSpan={2}>
              G1 {kilosText(sale.g1_kg)} kg · G2 {kilosText(sale.g2_kg)} kg
            </td>
            <td className="py-2 text-right tabular-nums">
              {formatPesos(sale.total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {sale.notes && (
        <p>
          <span className="font-bold">Observaciones: </span>
          {sale.notes}
        </p>
      )}
      <div className="space-y-1 text-sm">
        <p>
          Registrada por {sale.created_by.full_name} el{' '}
          {formatDateTime(sale.created_at)}
        </p>
        {voided && (
          <p>
            Anulada por {voided.voided_by.full_name} el{' '}
            {formatDateTime(voided.voided_at)} · Motivo: {voided.reason}
          </p>
        )}
      </div>
      <p className="border-t border-black pt-3 text-sm">
        Este comprobante resume la venta registrada en Ruta del Cacao. No es una
        factura electrónica ni la reemplaza.
      </p>
    </article>
  );
}
