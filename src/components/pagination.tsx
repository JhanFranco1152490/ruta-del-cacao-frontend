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
      className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <p className="text-sm text-muted-foreground">
        {total} {label} encontrados
      </p>
      <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between">
        <Button
          className="h-10"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          variant="outline"
        >
          Anterior
        </Button>
        <span className="text-sm font-bold whitespace-nowrap">
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
