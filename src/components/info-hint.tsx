'use client';

import { PreviewCard } from '@base-ui/react/preview-card';
import { Info } from 'lucide-react';

// Un ícono «i» que explica algo al poner el mouse encima: para lo que ayuda a entender una opción
// pero no merece ocupar espacio todo el tiempo (la descripción de una plaga). Solo se abre con el
// mouse; quien lo necesite sin mouse debe tener el mismo texto en otro sitio (`sr-only` junto al
// campo), porque el ícono no recibe el foco.
export function InfoHint({ text }: { text: string }) {
  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger
        aria-hidden="true"
        closeDelay={100}
        delay={150}
        render={
          <span className="inline-flex shrink-0 cursor-help text-muted-foreground hover:text-selva" />
        }
      >
        <Info className="size-4" />
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner className="z-[60]" side="right" sideOffset={8}>
          <PreviewCard.Popup className="max-w-xs rounded-lg bg-popover p-3 text-sm leading-5 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            {text}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
