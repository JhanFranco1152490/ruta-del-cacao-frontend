import { cn } from 'cn';
import type { ReactNode } from 'react';

import { BotanicalVine } from '@/components/brand/botanical-vine';

// Marco de las pantallas con sesión: recibe la cabecera y la navegación ya armadas para no
// conocer la sesión. Es el único lugar que dibuja el <main>: las pantallas no deben traer el suyo.
export function AppShell({
  header,
  sidebar,
  sidebarHidden = false,
  children,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  sidebarHidden?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:font-bold focus:text-selva"
      >
        Saltar al contenido
      </a>
      {header}
      <div className="flex flex-1">
        {/* Se colapsa por ancho y no con display:none para poder animarla; inert saca su
            contenido del orden de tabulación y del árbol de accesibilidad mientras está
            oculta. overflow-x-clip (no hidden) para que el sticky interno siga funcionando. */}
        <aside
          id="barra-lateral"
          inert={sidebarHidden}
          className={cn(
            'hidden shrink-0 overflow-x-clip border-r border-selva-barra bg-selva-barra text-crema transition-[width,visibility,border-color] duration-200 ease-out motion-reduce:transition-none lg:block',
            sidebarHidden
              ? 'lg:invisible lg:w-0 lg:border-transparent'
              : 'lg:w-60',
          )}
        >
          {/* top-16: la altura del encabezado fijo. La rama es un adorno fijo al fondo, fuera de lo que
              se desplaza: dentro del contenedor sumaba 176 px al alto y la barra de desplazamiento
              aparecía aunque el menú cupiera. */}
          <div className="sticky top-16 h-[calc(100dvh-4rem)] w-60">
            <BotanicalVine className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-60 opacity-50" />
            <div className="scrollbar-on-dark relative h-full overflow-y-auto p-4">
              {sidebar}
            </div>
          </div>
        </aside>
        <main
          id="contenido"
          tabIndex={-1}
          className="min-w-0 flex-1 outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
