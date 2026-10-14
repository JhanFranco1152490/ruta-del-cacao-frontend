import type { ComponentProps } from 'react';
import { cn } from 'cn';

type NativeSelectProps = ComponentProps<'select'> & {
  // Texto que se ve mientras no hay nada elegido. No es un valor: no se puede volver a elegir
  // ni aparece en la lista de opciones.
  placeholder?: string;
};

// Select nativo con el estilo de los campos de oficina: funciona con teclado, lectores de
// pantalla y react-hook-form sin trabajo extra. No define outline ni halo de foco a propósito:
// así queda el anillo global de 3 px cobre, también en estado de error.
function NativeSelect({
  className,
  children,
  placeholder,
  value,
  defaultValue,
  ...props
}: NativeSelectProps) {
  // Un select sin valor inicial toma la primera opción que no esté deshabilitada, y ahí no
  // estaría el texto de ayuda sino la primera opción real.
  const startsEmpty =
    placeholder !== undefined &&
    value === undefined &&
    defaultValue === undefined;
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-11 w-full rounded-md border border-input bg-card px-3 text-base text-foreground transition-colors focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-err',
        placeholder !== undefined &&
          'has-[option[value=""]:checked]:text-muted-foreground [&>option]:text-foreground',
        className,
      )}
      defaultValue={startsEmpty ? '' : defaultValue}
      value={value}
      {...props}
    >
      {placeholder !== undefined && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}

export { NativeSelect };
