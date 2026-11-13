import { cn } from 'cn';

import { TableCell } from '@/components/ui/table';

import type { Report } from '../api';
import { cellLines } from '../report-cell-lines';
import { formatCell, isNumericKind } from '../report-cells';
import type { ReportTableColumn } from '../report-column-groups';

// En la tarjeta de celular la fila de títulos no se ve: cada dato lleva su nombre encima, pequeño.
// Los lectores de pantalla ya lo leen en el encabezado de la columna.
function MobileLabel({ children }: { children: string }) {
  return (
    <span
      aria-hidden="true"
      className="block text-xs text-muted-foreground md:hidden"
    >
      {children}
    </span>
  );
}

// Una celda de la tabla: una columna sola, o un grupo con una línea por cada una de las suyas. La
// primera de la fila es el título de la tarjeta de celular; las demás van de a dos por línea.
export function ReportTableCell({
  cell,
  row,
  first,
}: {
  cell: ReportTableColumn;
  row: Report['rows'][number];
  first: boolean;
}) {
  const label = cell.type === 'single' ? cell.column.label : cell.label;
  const position = first ? 'font-bold' : 'max-md:col-span-1!';

  if (cell.type === 'single') {
    const { column } = cell;
    const numeric = isNumericKind(column.kind);
    return (
      <TableCell
        className={cn(
          'whitespace-normal',
          numeric && 'tabular-nums md:text-right',
          position,
        )}
      >
        {!first && <MobileLabel>{label}</MobileLabel>}
        {formatCell(row[column.key], column.kind)}
      </TableCell>
    );
  }

  return (
    <TableCell className={cn('whitespace-normal', position)}>
      {!first && <MobileLabel>{label}</MobileLabel>}
      {cellLines(cell.columns, row).map((line, index) => (
        <span
          className={cn(
            'block tabular-nums',
            first && index > 0 && 'font-normal text-muted-foreground',
          )}
          key={line.key}
        >
          {line.label && (
            <span className="text-muted-foreground">{line.label} </span>
          )}
          {line.text}
        </span>
      ))}
    </TableCell>
  );
}
