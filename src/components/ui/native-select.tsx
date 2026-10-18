import type { ComponentProps } from 'react';
import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';

type NativeSelectProps = ComponentProps<'select'> & {
  // Texto que se ve mientras no hay nada elegido. No es un valor: no se puede volver a elegir
  // ni aparece en la lista de opciones.
  placeholder?: string;
  // El ancho, cuando el select va suelto en una fila (sin `SelectField`): lo lleva la caja que
  // también contiene la flecha.
  wrapperClassName?: string;
};

// Select nativo con el estilo de los campos de oficina: funciona con teclado, lectores de
// pantalla y react-hook-form sin trabajo extra. No define outline ni halo de foco a propósito:
// así queda el anillo global de 3 px cobre, también en estado de error.
function NativeSelect({
  className,
  children,
  placeholder,
  wrapperClassName,
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
  // La flecha del navegador queda pegada al borde y cambia de un navegador a otro: se oculta y se
  // dibuja la misma de `SearchSelect`, a la misma distancia del borde.
  return (
    <span className={cn('relative block w-full', wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          'h-11 w-full appearance-none rounded-md border border-input bg-card py-0 pr-10 pl-3 text-base text-foreground transition-colors focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-err',
          // La opción elegida se pinta con su propio color, no con el del select: por eso las
          // opciones reales fijan el suyo y el placeholder hereda el gris.
          placeholder !== undefined &&
            'has-[option[value=""]:checked]:text-muted-foreground [&>option:not([value=""])]:text-foreground',
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
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}

export { NativeSelect };
