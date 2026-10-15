'use client';

import { MoreHorizontal } from 'lucide-react';
import { cn } from 'cn';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuTrigger } from '@/components/ui/menu';

// El menú «⋯» de una tarjeta o una fila: las acciones que no se hacen a diario (editar, desactivar,
// eliminar) detrás de un solo botón de 44 px, para que la acción principal tenga el espacio. Las
// opciones son `MenuItem`; las que abren una confirmación la montan fuera del menú, que se
// desmonta al cerrarse, y la abren con su estado.
export function ActionsMenu({
  label,
  className,
  children,
}: {
  // Nombra al botón para los lectores de pantalla: «Más acciones de Finca Yan».
  label: string;
  // Para cambiar el tamaño del botón donde no cabe el de 44 px de ancho.
  className?: string;
  children: ReactNode;
}) {
  return (
    <Menu>
      <MenuTrigger
        aria-label={label}
        render={
          <Button
            className={cn('px-3', className)}
            size="office"
            variant="action"
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>{children}</MenuContent>
    </Menu>
  );
}
