import type { ComponentProps } from 'react';
import { cn } from 'cn';

// Select nativo con el estilo de los campos de oficina: funciona con teclado, lectores de
// pantalla y react-hook-form sin trabajo extra. No define outline ni halo de foco a propósito:
// así queda el anillo global de 3 px cobre, también en estado de error.
function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-11 w-full rounded-md border border-input bg-card px-3 text-base text-foreground transition-colors focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-err',
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
