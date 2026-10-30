import { cn } from 'cn';
import { Cloud, CloudRain, CloudSun, Sun } from 'lucide-react';
import type { ComponentType } from 'react';

import { InlineError } from '@/components/form-message';

import type { Weather } from '../api';
import { WEATHERS } from '../log-form';

const ICONS: Record<Weather, ComponentType<{ className?: string }>> = {
  sunny: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  rainy: CloudRain,
};

// El clima del día: cuatro opciones grandes con ícono y nombre, de un toque, para elegir con
// guantes. Es un grupo de opciones de un mismo campo, no cuatro campos.
export function WeatherPicker({
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: {
  value: string;
  onChange: (weather: Weather) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-bold text-selva">
        Clima del día
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WEATHERS.map(({ value: option, label }) => {
          const Icon = ICONS[option];
          return (
            <label
              className={cn(
                'flex min-h-[var(--control-h-field)] cursor-pointer items-center justify-center gap-2 rounded-(--radius-field) border border-border px-2 text-center text-sm font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cobre',
                value === option
                  ? 'border-selva bg-selva text-white'
                  : 'bg-card text-selva hover:bg-surface-alt',
              )}
              key={option}
            >
              <input
                checked={value === option}
                className="sr-only"
                name="weather"
                onBlur={onBlur}
                onChange={() => onChange(option)}
                type="radio"
                value={option}
              />
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              {/* Un nombre que se parte en dos líneas ocuparía todo el ancho y dejaría el ícono contra
                  el borde: medido a su palabra más larga, queda pegado al ícono como los demás. */}
              <span className="w-min">{label}</span>
            </label>
          );
        })}
      </div>
      <InlineError>{error}</InlineError>
    </fieldset>
  );
}
