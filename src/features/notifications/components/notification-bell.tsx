import { Bell } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';

import { bellCount, bellLabel } from '../bell-text';

// La campana de la cabecera, con el aspecto del indicador de la bandeja de registros. El número
// va a la vista; la etiqueta lo dice completo para el lector de pantalla.
export function NotificationBell({
  count,
  ...props
}: { count: number } & Omit<ComponentProps<typeof Button>, 'children'>) {
  return (
    <Button
      aria-label={bellLabel(count)}
      className="relative h-11 px-3"
      type="button"
      variant="outline"
      {...props}
    >
      <Bell aria-hidden="true" className="size-5 text-selva" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-err px-1 text-center text-xs leading-5 font-bold text-white"
        >
          {bellCount(count)}
        </span>
      )}
    </Button>
  );
}
