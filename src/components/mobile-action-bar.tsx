import type { ReactNode } from 'react';

// Las acciones principales de un formulario largo. En escritorio van en línea, donde las pone
// quien lo usa; en un celular quedan fijas al pie, para guardar sin recorrer de vuelta toda la
// pantalla. El espacio de abajo evita que la barra tape el final del formulario.
export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex flex-col gap-3 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:flex-row max-lg:flex-wrap max-lg:border-t max-lg:border-border max-lg:bg-card max-lg:px-4 max-lg:pt-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>
      <div aria-hidden="true" className="h-24 lg:hidden" />
    </>
  );
}
