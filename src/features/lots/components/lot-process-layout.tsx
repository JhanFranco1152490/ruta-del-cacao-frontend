'use client';

import type { ReactNode } from 'react';

import type { Lot } from '../api';
import { type StagePicker, useStagePicker } from '../stage-picker';

// El proceso del lote: a un lado el origen, la lista de etapas con su resumen y las acciones de la
// ficha («Volver»); al otro, la etapa elegida con todo el espacio, que cabe aunque traiga una
// tabla. La columna del lado se pega bajo la cabecera de la app y, si no cabe en la pantalla, se
// desplaza sola. En celular el orden es el de la tarea: la lista, la etapa y, al final, el origen y
// las acciones. Las secciones son de otros dominios: se montan dos veces, como renglón de la lista y
// como panel, con el mismo control para que compartan cuál es la elegida.
export function LotProcessLayout({
  lot,
  origin,
  footer,
  renderSections,
}: {
  lot: Lot;
  origin: ReactNode;
  footer: ReactNode;
  renderSections?: (lot: Lot, picker: StagePicker) => ReactNode;
}) {
  const { items, panels } = useStagePicker(lot.status);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:items-start">
      <aside className="max-lg:contents lg:sticky lg:top-20 lg:-m-1 lg:flex lg:max-h-[calc(100dvh-6rem)] lg:flex-col lg:gap-4 lg:overflow-y-auto lg:p-1">
        <div className="max-lg:order-3 lg:order-1">{origin}</div>
        <nav
          aria-label="Etapas del lote"
          className="overflow-hidden rounded-[var(--radius-card)] bg-card shadow-card empty:hidden max-lg:order-1 lg:order-2"
        >
          {renderSections?.(lot, items)}
        </nav>
        <div className="max-lg:order-4 lg:order-3">{footer}</div>
      </aside>
      <div className="min-w-0 max-lg:order-2">
        {renderSections?.(lot, panels)}
      </div>
    </div>
  );
}
