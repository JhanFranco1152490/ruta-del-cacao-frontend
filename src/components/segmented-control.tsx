import { cn } from 'cn';

// Pocas opciones excluyentes como botones juntos, con la elegida marcada (p. ej. el mapa base o
// la vista del mapa).
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  // Más bajo y apretado, para las barras de herramientas donde cada fila cuenta.
  compact?: boolean;
}) {
  return (
    <div
      aria-label={label}
      className={cn(
        'inline-flex rounded-md border border-border bg-card',
        compact ? 'p-0.5' : 'p-1',
      )}
      role="group"
    >
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={cn(
            'rounded-[calc(var(--radius)-2px)] text-sm font-bold whitespace-nowrap focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre',
            compact ? 'min-h-9 px-3' : 'min-h-11 px-4',
            value === option.value
              ? 'bg-selva text-white'
              : 'text-selva hover:bg-surface-alt',
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
