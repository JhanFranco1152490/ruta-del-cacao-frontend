import type { ReactNode } from 'react';

import { CacaoPlant } from '@/components/brand/cacao-plant';

// Pantalla completa para lo que no es una sección: una dirección que no existe o un error que
// nadie atrapó. Con la mata de la marca en vez de la página genérica del framework (en inglés).
export function StatusPage({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-8">
      <CacaoPlant className="h-40 w-44" />
      <p className="section-label mt-6">{eyebrow}</p>
      <h1 className="mt-2 text-4xl text-selva">{title}</h1>
      <span
        aria-hidden="true"
        className="mt-3 block h-1 w-12 rounded-full bg-cobre"
      />
      <p className="mt-4 text-muted-foreground">{description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>
    </div>
  );
}
