import { cn } from 'cn';

export type ShareSegment = {
  key: string;
  label: string;
  // Su parte del total, de 0 a 100; `null` si no hay total sobre el que repartir.
  percent: number | null;
  percentLabel: string;
  valueLabel: string;
  color: string;
};

// Un total repartido en partes (G1, G2 y descarte) en una sola barra, con cada parte escrita debajo:
// el color solo no dice nada, el texto sí. Sin total, la barra queda vacía.
export function ShareBar({
  label,
  segments,
  compact = false,
  className,
}: {
  label: string;
  segments: readonly ShareSegment[];
  // Una sola línea de texto en lugar de la leyenda: para una fila de una lista, donde la leyenda se
  // repetiría en cada una.
  compact?: boolean;
  className?: string;
}) {
  const summary = segments
    .map((segment) => `${segment.label} ${segment.percentLabel}`)
    .join(', ');
  return (
    <div className={cn('space-y-2', className)}>
      <div
        aria-label={`${label}: ${summary}`}
        className="flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
      >
        {segments.map(({ key, percent, color }) =>
          percent ? (
            <div
              key={key}
              style={{
                backgroundColor: color,
                flexGrow: percent,
                flexBasis: 0,
              }}
            />
          ) : null,
        )}
      </div>
      {compact ? (
        <p className="text-xs text-muted-foreground tabular-nums">{summary}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {segments.map((segment) => (
            <li className="flex min-w-0 items-start gap-2" key={segment.key}>
              <span
                aria-hidden="true"
                className="mt-1.5 size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="min-w-0">
                <span className="block font-semibold">{segment.label}</span>
                <span className="block text-muted-foreground tabular-nums">
                  {segment.percentLabel} · {segment.valueLabel}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
