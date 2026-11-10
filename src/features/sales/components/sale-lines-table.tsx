import Link from 'next/link';

import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPesos } from '@/lib/format/pesos';
import { GRADE_LABELS, kilosText } from '@/lib/stock-quantity';

import type { SaleLine } from '../api';

// Las líneas de una venta con su total al pie. El código del lote lleva a su ficha solo si la cuenta
// la puede ver (y hay conexión: la ficha del lote no guarda copia de los lotes vendidos). En celular,
// cada línea es una tarjeta: el lote y el calibre arriba, kilos y precio en medio, el subtotal abajo.
export function SaleLinesTable({
  lines,
  total,
  lotHref,
}: {
  lines: readonly SaleLine[];
  total: number;
  lotHref: ((id: string) => string) | null;
}) {
  return (
    <Table aria-label="Líneas de la venta" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Lote</TableHead>
          <TableHead>Calibre</TableHead>
          <TableHead className="text-right">Kilos</TableHead>
          <TableHead className="text-right">Precio por kilo</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.id}>
            <TableCell className="font-mono font-bold break-all whitespace-normal max-md:order-1 max-md:col-span-1!">
              {lotHref ? (
                <Link
                  className="text-selva underline-offset-2 hover:underline"
                  href={lotHref(line.lot.id)}
                >
                  {line.lot.code}
                </Link>
              ) : (
                line.lot.code
              )}
            </TableCell>
            <TableCell className="font-bold max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
              {GRADE_LABELS[line.grade]}
            </TableCell>
            <TableCell className="text-right tabular-nums max-md:order-3 max-md:col-span-1! max-md:text-left">
              {kilosText(line.quantity_kg)} kg
            </TableCell>
            <TableCell className="text-right tabular-nums max-md:order-4 max-md:col-span-1! max-md:justify-self-end">
              <span className="md:hidden">a </span>
              {formatPesos(line.price_per_kg)}
              <span className="md:hidden"> por kilo</span>
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums max-md:order-5 max-md:text-left">
              {formatPesos(line.subtotal)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter className="max-md:block">
        <TableRow className="max-md:flex max-md:justify-between max-md:border-0 max-md:p-3">
          <TableCell className="font-bold" colSpan={4}>
            Valor total
          </TableCell>
          <TableCell className="text-right font-bold tabular-nums">
            {formatPesos(total)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
