import type { ReactNode } from 'react';

// Las acciones principales de un formulario largo. En escritorio van en línea, donde las pone
// quien lo usa; en un celular quedan fijas al pie, para guardar sin recorrer de vuelta toda la
// pantalla. En el celular quedan en una fila (Cancelar a la izquierda, la acción principal al doble
// de ancho) para ocupar la mitad de alto que apiladas. El espacio de abajo evita que la barra tape
// el final del formulario. `mb-0!` porque el contenedor del formulario suele separar a sus hijos con
// `space-y-*`, que le pone margen abajo, y una barra fija con margen queda despegada del borde.
export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex flex-col gap-3 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:mb-0! max-lg:flex-row-reverse max-lg:gap-2 max-lg:border-t max-lg:border-border max-lg:bg-card max-lg:px-4 max-lg:pt-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:flex-row lg:flex-wrap lg:items-center max-lg:[&>*]:w-auto max-lg:[&>*]:min-w-0 max-lg:[&>*]:flex-1 max-lg:[&>*:first-child]:flex-[2]">
        {children}
      </div>
      <div aria-hidden="true" className="h-20 lg:hidden" />
    </>
  );
}
