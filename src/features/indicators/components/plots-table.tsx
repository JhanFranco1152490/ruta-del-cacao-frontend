import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDecimal } from '@/lib/format/decimal';
import { plotLabel } from '@/lib/format/place-label';

import type { ProducerIndicators } from '../api';
import { formatKg, formatKgPerHectare } from '../indicator-format';
import { plotRows } from '../plot-rows';

// Cada parcela con sus kilos, su rendimiento y cuánto se aleja del promedio de la unidad, de la más a
// la menos productiva. En celular cada fila es una tarjeta: nombre arriba y los datos en una línea.
export function PlotsTable({
  production,
}: {
  production: ProducerIndicators['production'];
}) {
  const rows = plotRows(production.plots, production.green_kg_per_hectare);
  return (
    <Table aria-label="Parcelas" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Parcela</TableHead>
          <TableHead className="text-right">En baba</TableHead>
          <TableHead className="text-right">Seco</TableHead>
          <TableHead className="text-right">Por hectárea</TableHead>
          <TableHead>Frente al promedio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ plot, versusAverage, extreme }) => (
          <TableRow key={plot.plot_id}>
            <TableCell className="font-semibold">
              {plot.farm_code} ·{' '}
              {plotLabel({ code: plot.plot_code, name: plot.plot_name })}
              {!plot.is_active && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Inactiva
                </span>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums max-md:text-left">
              <span className="text-muted-foreground md:hidden">En baba: </span>
              {formatKg(plot.green_kg)}
            </TableCell>
            <TableCell className="text-right tabular-nums max-md:text-left">
              <span className="text-muted-foreground md:hidden">Seco: </span>
              {formatKg(plot.dry_kg)}
            </TableCell>
            <TableCell className="text-right tabular-nums max-md:text-left">
              {formatKgPerHectare(plot.green_kg_per_hectare)} ·{' '}
              {formatDecimal(plot.area_hectares, 2)} ha
            </TableCell>
            <TableCell>
              {versusAverage === null ? (
                <span className="text-muted-foreground">Sin cosecha</span>
              ) : (
                <Badge
                  variant={
                    extreme === 'lowest'
                      ? 'err'
                      : extreme === 'best'
                        ? 'ok'
                        : 'info'
                  }
                >
                  {versusAverage >= 0 ? '▲' : '▼'} {Math.abs(versusAverage)} %
                  {extreme === 'best' && ' · la mejor'}
                  {extreme === 'lowest' && ' · la más baja'}
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
