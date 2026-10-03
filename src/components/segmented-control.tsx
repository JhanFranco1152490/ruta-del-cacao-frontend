import { cn } from 'cn';

// Pocas opciones excluyentes como botones juntos, con la elegida marcada (p. ej. el mapa base o
// la vista del mapa).
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      aria-label={label}
      className="inline-flex rounded-md border border-border bg-card p-1"
      role="group"
    >
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={cn(
            'min-h-11 rounded-[calc(var(--radius)-2px)] px-4 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre',
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
