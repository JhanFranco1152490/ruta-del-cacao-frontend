'use client';

import { useId } from 'react';
import { cn } from 'cn';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { NativeSelect } from '@/components/ui/native-select';

import { EARLIEST_PLANTING_YEAR } from '../schemas';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

// Mes y año en dos listas, y no un campo de tipo `month`: ese campo no existe en todos los
// navegadores y, donde falta, obliga a escribir "2021-03" a mano. El valor es `AAAA-MM`; con solo
// una de las dos partes elegida queda incompleto y el formulario lo marca.
export function PlantingMonthField({
  value,
  onChange,
  onBlur,
  error,
  hint,
  today,
  index,
}: {
  // La siembra a la que pertenece, para que cada fila tenga nombres distintos para un lector de
  // pantalla ("Mes de siembra 2").
  index?: number;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  today: Date;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const [year = '', month = ''] = value.split('-');
  const years = Array.from(
    { length: today.getFullYear() - EARLIEST_PLANTING_YEAR + 1 },
    (_, index) => String(today.getFullYear() - index),
  );
  const change = (nextYear: string, nextMonth: string) =>
    onChange(nextYear || nextMonth ? `${nextYear}-${nextMonth}` : '');
  const help = error || hint;
  const suffix = index === undefined ? '' : ` ${index}`;
  const control = {
    'aria-invalid': Boolean(error),
    'aria-describedby': help ? helpId : undefined,
    className: CAPTURE_FIELD_CLASS,
  };

  return (
    // Se valida al salir del grupo y no de cada lista: al pasar del mes al año todavía falta una
    // parte, y marcarlo como error en ese momento taparía la edad con un aviso que no aplica.
    <fieldset
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
      }}
    >
      <legend className="mb-2 block text-sm font-bold text-selva">
        Fecha de siembra
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="sr-only" htmlFor={`${id}-month`}>
            {`Mes de siembra${suffix}`}
          </label>
          <NativeSelect
            {...control}
            id={`${id}-month`}
            value={month}
            onChange={(event) => change(year, event.target.value)}
          >
            <option value="">Mes</option>
            {MONTHS.map((name, index) => (
              <option key={name} value={String(index + 1).padStart(2, '0')}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label className="sr-only" htmlFor={`${id}-year`}>
            {`Año de siembra${suffix}`}
          </label>
          <NativeSelect
            {...control}
            id={`${id}-year`}
            value={year}
            onChange={(event) => change(event.target.value, month)}
          >
            <option value="">Año</option>
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {help && (
        <p
          className={cn(
            'mt-2 text-sm',
            error ? 'text-err' : 'text-muted-foreground',
          )}
          id={helpId}
          role={error ? 'alert' : undefined}
        >
          {help}
        </p>
      )}
    </fieldset>
  );
}
