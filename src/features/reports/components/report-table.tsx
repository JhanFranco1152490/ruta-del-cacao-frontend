import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { Report } from '../api';
import { isNumericKind } from '../report-cells';
import { groupColumns } from '../report-column-groups';
import { ReportTableCell } from './report-table-cell';

// La tabla de cualquier reporte, armada con las columnas que manda el servidor: no conoce los
// tipos. Las columnas que van juntas comparten celda para que quepa a 1280 px; en celular cada fila
// es una tarjeta.
export function ReportTable({ report }: { report: Report }) {
  const table = groupColumns(report.columns);
  return (
    <Table
      aria-label={`Filas del reporte de ${report.title}`}
      className={COMPACT_TABLE_CLASS}
    >
      <TableHeader>
        <TableRow>
          {table.map((cell) => (
            <TableHead
              className={
                cell.type === 'single' && isNumericKind(cell.column.kind)
                  ? 'text-right'
                  : undefined
              }
              key={cell.key}
            >
              {cell.type === 'single' ? cell.column.label : cell.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.rows.map((row, index) => (
          // Las filas no traen id y no cambian de orden: el reporte se dibuja de nuevo al generarse.
          <TableRow key={index}>
            {table.map((cell, position) => (
              <ReportTableCell
                cell={cell}
                first={position === 0}
                key={cell.key}
                row={row}
              />
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
