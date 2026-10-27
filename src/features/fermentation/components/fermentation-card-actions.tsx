import { cn } from 'cn';
import { Eye, RotateCw } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';

import type { Fermentation } from '../api';
import { turnPath } from '../fermentation-paths';
import type { QueuedTurn } from '../turn-queue';
import { FinishFermentationButton } from './finish-fermentation-button';

// Lo que se hace desde la tarjeta de un lote: Registrar volteo es lo principal; Finalizar se hace
// una vez por lote, pero desde aquí y no desde su ficha; ver el lote es un atajo de icono. Los tres
// en una sola fila, también en celular.
export function FermentationCardActions({
  fermentation,
  queued,
  lotHref,
  canManage,
  online,
  autoFinish = false,
  onAutoFinished,
}: {
  fermentation: Fermentation;
  queued: readonly QueuedTurn[];
  lotHref: (id: string) => string;
  // Finalizar es de quien responde por la fermentación y necesita conexión: libera el cajón.
  canManage: boolean;
  online: boolean;
  autoFinish?: boolean;
  onAutoFinished?: () => void;
}) {
  const { lot } = fermentation;
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2">
      <EditorLink
        className={cn(
          buttonVariants({ variant: 'action', size: 'office' }),
          'max-sm:flex-1 max-sm:px-3',
        )}
        href={turnPath(lot.id)}
      >
        <RotateCw aria-hidden="true" className="size-4 max-[400px]:hidden" />{' '}
        Registrar volteo
      </EditorLink>
      {canManage && (
        <FinishFermentationButton
          autoOpen={autoFinish}
          fermentation={fermentation}
          inRow
          onAutoOpened={onAutoFinished}
          online={online}
          queued={queued}
        />
      )}
      <EditorLink
        aria-label={`Ver el lote ${lot.code}`}
        className={cn(
          buttonVariants({ variant: 'action', size: 'office' }),
          'px-3',
        )}
        href={lotHref(lot.id)}
      >
        <Eye aria-hidden="true" className="size-4" />
      </EditorLink>
    </div>
  );
}
