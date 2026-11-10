import { cn } from 'cn';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import { TableHead } from '@/components/ui/table';

// El orden se escribe como el `ordering` de la API: el campo, o con `-` delante si es descendente.
export type SortDirection = 'ascending' | 'descending' | 'none';

export const sortDirectionOf = (
  field: string,
  ordering: string | null,
): SortDirection => {
  if (ordering === field) return 'ascending';
  if (ordering === `-${field}`) return 'descending';
  return 'none';
};

// Tocar la columna por la que ya se ordena invierte el sentido; tocar otra ordena por ella de menor
// a mayor.
export const nextOrdering = (field: string, ordering: string | null) =>
  ordering === field ? `-${field}` : field;

const ICONS = {
  ascending: ArrowUp,
  descending: ArrowDown,
  none: ArrowUpDown,
} as const;

// La cabecera de una columna por la que se puede ordenar. No sabe de la URL: recibe el orden actual
// (ya resuelto, también el que la pantalla usa por defecto) y entrega el siguiente. El botón mide lo
// mismo que la fila de títulos (40 px): en celular esa fila se oculta y el orden se elige aparte.
export function SortableTableHead({
  field,
  label,
  ordering,
  onSort,
  align = 'left',
  className,
}: {
  field: string;
  label: string;
  ordering: string | null;
  onSort: (ordering: string) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const direction = sortDirectionOf(field, ordering);
  const Icon = ICONS[direction];
  return (
    <TableHead
      aria-sort={direction}
      className={cn(align === 'right' && 'text-right', className)}
    >
      <button
        className={cn(
          'inline-flex min-h-10 items-center gap-1 rounded-sm font-bold text-selva hover:underline',
          align === 'right' && 'flex-row-reverse',
          FOCUS_OUTLINE_CLASS,
        )}
        onClick={() => onSort(nextOrdering(field, ordering))}
        type="button"
      >
        {label}
        <Icon
          aria-hidden="true"
          className={cn(
            'size-3.5 shrink-0',
            direction === 'none' && 'text-muted-foreground',
          )}
        />
      </button>
    </TableHead>
  );
}
