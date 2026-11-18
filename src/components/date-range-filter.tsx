import { cn } from 'cn';

import { TextField } from '@/components/text-field';

// Las dos fechas de un periodo en una fila de filtros: de 40 px y sin etiqueta a la vista (la lee el
// lector de pantalla y sale al pasar el cursor). El error del periodo va debajo de la primera, que
// es la que abre el rango.
export function DateRangeFilter({
  from,
  to,
  onFrom,
  onTo,
  error,
  fromLabel = 'Desde',
  toLabel = 'Hasta',
  className,
}: {
  from: string | null;
  to: string | null;
  onFrom: (date: string) => void;
  onTo: (date: string) => void;
  error?: string | null;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex w-full items-start gap-2 sm:w-auto', className)}>
      <TextField
        className="h-10 text-sm"
        error={error ?? undefined}
        hideLabel
        label={fromLabel}
        onChange={(event) => onFrom(event.target.value)}
        title={fromLabel}
        type="date"
        value={from ?? ''}
        wrapperClassName="min-w-0 flex-1 sm:w-40 sm:flex-none"
      />
      <span aria-hidden="true" className="pt-2">
        –
      </span>
      <TextField
        className="h-10 text-sm"
        hideLabel
        label={toLabel}
        onChange={(event) => onTo(event.target.value)}
        title={toLabel}
        type="date"
        value={to ?? ''}
        wrapperClassName="min-w-0 flex-1 sm:w-40 sm:flex-none"
      />
    </div>
  );
}
