import { cn } from 'cn';
import { ClipboardPen, Eye } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';

import type { Drying } from '../api';
import type { QueuedLog } from '../log-queue';
import { logPath } from '../drying-paths';
import { FinishDryingButton } from './finish-drying-button';

// Lo que se hace desde la tarjeta de un lote: Registrar bitácora es lo principal; Finalizar se hace
// una vez por lote; ver el lote es un atajo de icono. Los tres en una sola fila, también en celular.
export function DryingCardActions({
  drying,
  queued,
  lotHref,
  canManage,
  online,
  autoFinish = false,
  onAutoFinished,
}: {
  drying: Drying;
  queued: readonly QueuedLog[];
  lotHref: (id: string) => string;
  // Finalizar es de quien responde por el secado y necesita conexión: libera la marquesina.
  canManage: boolean;
  online: boolean;
  autoFinish?: boolean;
  onAutoFinished?: () => void;
}) {
  const { lot } = drying;
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2">
      <EditorLink
        className={cn(
          buttonVariants({ size: 'office' }),
          'max-sm:flex-1 max-sm:px-3',
        )}
        href={logPath(lot.id)}
      >
        <ClipboardPen
          aria-hidden="true"
          className="size-4 max-[400px]:hidden"
        />{' '}
        Registrar bitácora
      </EditorLink>
      {canManage && (
        <FinishDryingButton
          autoOpen={autoFinish}
          drying={drying}
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
