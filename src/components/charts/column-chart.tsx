import { cn } from 'cn';

export type ColumnSeries = { key: string; label: string; color: string };

export type ColumnGroup = {
  key: string;
  // La marca del eje («mar») y el nombre completo para el tooltip y el lector de pantalla.
  tick: string;
  title: string;
  values: Record<string, number>;
};

// Columnas por grupo (un mes) y por serie, todas a la escala de la mayor. Lo dibujado es
// decorativo: el mismo dato va en una tabla para el lector de pantalla y en el tooltip de cada
// mes, que es lo que se lee con el dedo o el puntero.
export function ColumnChart({
  label,
  series,
  groups,
  formatValue,
  className,
}: {
  label: string;
  series: readonly ColumnSeries[];
  groups: readonly ColumnGroup[];
  formatValue: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(
    0,
    ...groups.flatMap(({ values }) =>
      series.map(({ key }) => values[key] ?? 0),
    ),
  );
  const summary = (group: ColumnGroup) =>
    `${group.title}: ${series
      .map(
        ({ key, label: name }) =>
          `${name} ${formatValue(group.values[key] ?? 0)}`,
      )
      .join(', ')}`;
  return (
    <figure className={cn('space-y-2', className)}>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1">
          {series.map(({ key, label: name, color }) => (
            <li className="flex items-center gap-1.5" key={key}>
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: color }}
              />
              {name}
            </li>
          ))}
        </ul>
        <span aria-hidden="true">Mayor valor: {formatValue(max)}</span>
      </figcaption>
      <div
        aria-hidden="true"
        className="flex h-44 items-end gap-1 border-b border-border"
      >
        {groups.map((group) => (
          <div
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-px"
            key={group.key}
            title={summary(group)}
          >
            {series.map(({ key, color }) => {
              const value = group.values[key] ?? 0;
              return (
                <div
                  className="w-full max-w-5 rounded-t-sm"
                  key={key}
                  style={{
                    backgroundColor: color,
                    height: `${value > 0 && max > 0 ? Math.max((value / max) * 100, 2) : 0}%`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-1">
        {groups.map((group) => (
          <span
            className="min-w-0 flex-1 text-center text-[11px] whitespace-nowrap text-muted-foreground"
            key={group.key}
          >
            {group.tick}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            {series.map(({ key, label: name }) => (
              <th key={key} scope="col">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.key}>
              <th scope="row">{group.title}</th>
              {series.map(({ key }) => (
                <td key={key}>{formatValue(group.values[key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
