import type { ReactNode } from 'react';

// Un parámetro: su nombre y lo que hace a la izquierda, y sus campos a la derecha. En celular los
// campos pasan debajo, y los dos de un rango siguen en la misma fila porque son números cortos.
export function ParameterRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
      <div className="min-w-0 space-y-1">
        <h3 className="font-sans text-base font-bold text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:w-72">{children}</div>
    </div>
  );
}
