import { cn } from 'cn';
import { Copy, History } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { HERO_SECONDARY_CLASS } from '@/components/page-blocks/detail-hero';
import { Button, buttonVariants } from '@/components/ui/button';
import { copyText } from '@/lib/copy-text';

import type { Lot } from '../api';
import { lotHistoryPath } from '../lot-paths';
import { LotQrButton } from '../qr/lot-qr-button';

// Las acciones del encabezado de la ficha: la historia, el código QR y copiar el código del lote.
// Con la copia del dispositivo (sin conexión) la historia no se ofrece: se lee solo con conexión.
export function LotHeroActions({
  lot,
  fromCopy,
}: {
  lot: Lot;
  fromCopy: boolean;
}) {
  return (
    <>
      {!fromCopy && (
        <EditorLink
          className={cn(
            buttonVariants({ size: 'office', variant: 'outline' }),
            HERO_SECONDARY_CLASS,
          )}
          href={lotHistoryPath(lot.id)}
        >
          <History aria-hidden="true" className="size-4" /> Ver historia
        </EditorLink>
      )}
      <LotQrButton lot={lot} />
      <Button
        className={HERO_SECONDARY_CLASS}
        onClick={() =>
          void copyText(lot.code, {
            success: 'Código copiado',
            failure: 'No fue posible copiar el código. Selecciónalo y cópialo.',
          })
        }
        size="office"
        variant="outline"
      >
        <Copy aria-hidden="true" className="size-4" /> Copiar código
      </Button>
    </>
  );
}
