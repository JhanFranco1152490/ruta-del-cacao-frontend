import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  // Sustantivo en plural para el resumen, p. ej. "productores".
  label: string;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  label,
}: PaginationProps) {
  if (total <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <nav
      aria-label={`Paginación de ${label}`}
      className="mt-5 flex items-center justify-between gap-4"
    >
      <p className="text-sm text-muted-foreground">
        {total} {label} encontrados
      </p>
      <div className="flex items-center gap-3">
        <Button
          className="h-10"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          variant="outline"
        >
          Anterior
        </Button>
        <span className="text-sm font-bold">
          Página {page} de {totalPages}
        </span>
        <Button
          className="h-10"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          variant="outline"
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}

// El mismo paso de página en pequeño, para ponerlo arriba de una lista larga: así no hace falta
// bajar hasta el final para pasar a la siguiente. La paginación de abajo sigue siendo la completa.
export function PageStepper({
  page,
  pageSize,
  total,
  onPageChange,
  label,
}: PaginationProps) {
  if (total <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div
      aria-label={`Páginas de ${label}`}
      className="flex items-center gap-2"
      role="group"
    >
      <Button
        aria-label="Página anterior"
        className="size-10.5"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        size="icon"
        type="button"
        variant="outline"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Button>
      <span className="text-sm font-bold whitespace-nowrap">
        {page} / {totalPages}
      </span>
      <Button
        aria-label="Página siguiente"
        className="size-10.5"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        size="icon"
        type="button"
        variant="outline"
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
