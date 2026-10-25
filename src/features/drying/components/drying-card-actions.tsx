import { cn } from 'cn';
import { ClipboardPen, Eye } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';

import type { Drying } from '../api';
import { logPath } from '../drying-paths';

// Lo que se hace desde la tarjeta de un lote: Registrar bitácora es lo principal; ver el lote es un
// atajo de icono. En una sola fila, también en celular.
export function DryingCardActions({
  drying,
  lotHref,
}: {
  drying: Drying;
  lotHref: (id: string) => string;
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
