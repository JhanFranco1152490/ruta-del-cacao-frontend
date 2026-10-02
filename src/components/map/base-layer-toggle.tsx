import { cn } from 'cn';

import type { BaseLayerKind } from './base-layers';

const OPTIONS: readonly { value: BaseLayerKind; label: string }[] = [
  { value: 'map', label: 'Mapa' },
  { value: 'satellite', label: 'Satélite' },
];

// Parte de los controles propios del mapa: elegir el mapa base. Dos botones, uno marcado.
export function BaseLayerToggle({
  value,
  onChange,
}: {
  value: BaseLayerKind;
  onChange: (value: BaseLayerKind) => void;
}) {
  return (
    <div
      aria-label="Mapa base"
      className="inline-flex rounded-md border border-border bg-card p-1"
      role="group"
    >
      {OPTIONS.map((option) => (
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
