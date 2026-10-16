import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { buttonVariants } from '@/components/ui/button';

// El pie de una ficha: «Volver» a la izquierda y las acciones a la derecha, con la destructiva al
// final, lejos de Volver. La ruta de arriba no se lee como un botón para quien usa poco la web;
// Volver sí, y está donde termina lo que se estaba leyendo. En celular las acciones van primero y
// Volver al final, a todo el ancho.
export function DetailFooter({
  backHref,
  children,
}: {
  backHref: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link
        className={buttonVariants({
          size: 'office',
          variant: 'outline',
          className: 'h-11',
        })}
        href={backHref}
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Volver
      </Link>
      {children && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
