import { cn } from 'cn';

export type BarRow = {
  key: string;
  label: string;
  value: number;
  // El valor ya escrito («620 kg»): el gráfico no sabe de unidades.
  valueLabel: string;
  detail?: string;
};

// Una barra horizontal por fila, todas a la escala de la mayor. El valor va escrito en cada fila,
// así que la barra acompaña el número y no hace falta un eje. El color es el del acento del
// módulo (`--mod`) salvo que se pase otro.
export function BarList({
  label,
  rows,
  color = 'var(--mod)',
  className,
}: {
  label: string;
  rows: readonly BarRow[];
  color?: string;
  className?: string;
}) {
  const max = Math.max(0, ...rows.map(({ value }) => value));
  return (
    <ul
      aria-label={label}
      className={cn('motion-stagger space-y-3', className)}
    >
      {rows.map((row) => (
        <li className="min-w-0" key={row.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-semibold text-foreground">
              {row.label}
            </span>
            <span className="shrink-0 text-sm font-bold text-selva tabular-nums">
              {row.valueLabel}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: color,
                // Una fila con algo no desaparece por ser mucho menor que la mayor.
                width: `${row.value > 0 && max > 0 ? Math.max((row.value / max) * 100, 2) : 0}%`,
              }}
            />
          </div>
          {row.detail && (
            <p className="mt-0.5 text-xs text-muted-foreground">{row.detail}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
