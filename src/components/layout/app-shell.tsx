import type { ReactNode } from 'react';

// Marco de las pantallas con sesión: recibe la cabecera y la navegación ya armadas para no
// conocer la sesión. Es el único lugar que dibuja el <main>: las pantallas no deben traer el suyo.
export function AppShell({
  header,
  sidebar,
  children,
}: {
  header: ReactNode;
  sidebar: ReactNode;
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
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
          <div className="sticky top-0 p-4">{sidebar}</div>
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
