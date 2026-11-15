import { cn } from 'cn';

export type FunnelStep = {
  key: string;
  label: string;
  kg: number;
  valueLabel: string;
  note: string;
  color: string;
  // Un paso repartido en partes (lo clasificado en sus calibres): se dibuja apilado.
  parts?: readonly { key: string; label: string; kg: number; color: string }[];
};

// Columnas lado a lado, una por paso, a la escala del mayor, con su valor y una nota debajo. Cuenta
// una cadena de izquierda a derecha; el valor va escrito en cada paso, así que la altura acompaña.
export function Funnel({
  label,
  steps,
  className,
}: {
  label: string;
  steps: readonly FunnelStep[];
  className?: string;
}) {
  const max = Math.max(0, ...steps.map(({ kg }) => kg));
  const heightOf = (kg: number) =>
    `${kg > 0 && max > 0 ? Math.max((kg / max) * 100, 3) : 0}%`;
  return (
    <ol
      aria-label={label}
      className={cn(
        'motion-stagger grid grid-cols-5 gap-1.5 sm:gap-3',
        className,
      )}
    >
      {steps.map((step) => (
        <li className="min-w-0" key={step.key}>
          <div aria-hidden="true" className="flex h-40 items-end">
            <div
              className="flex w-full flex-col overflow-hidden rounded-t-md"
              style={{ height: heightOf(step.kg) }}
            >
              {step.parts && step.kg > 0 ? (
                step.parts.map((part) => (
                  <div
                    key={part.key}
                    style={{
                      backgroundColor: part.color,
                      flexGrow: part.kg,
                      flexBasis: 0,
                    }}
                    title={part.label}
                  />
                ))
              ) : (
                <div
                  className="h-full"
                  style={{ backgroundColor: step.color }}
                />
              )}
            </div>
          </div>
          <p className="mt-1.5 text-sm leading-tight font-bold break-words text-selva tabular-nums max-sm:text-xs">
            {step.valueLabel}
          </p>
          <p className="text-xs font-semibold max-sm:text-[11px]">
            {step.label}
          </p>
          <p className="text-xs text-muted-foreground max-sm:text-[11px]">
            {step.note}
          </p>
        </li>
      ))}
    </ol>
  );
}
