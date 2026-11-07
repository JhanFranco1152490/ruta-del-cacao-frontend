import { cn } from 'cn';
import { Eye } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';

// Atajo de icono a la ficha del lote. Lo usa la fila de acciones y, cuando el lote no tiene
// acciones, la esquina de la tarjeta.
export function LotViewLink({
  code,
  href,
  className,
}: {
  code: string;
  href: string;
  className?: string;
}) {
  return (
    <EditorLink
      aria-label={`Ver el lote ${code}`}
      className={cn(
        buttonVariants({ variant: 'action', size: 'office' }),
        'px-3',
        className,
      )}
      href={href}
    >
      <Eye aria-hidden="true" className="size-4" />
    </EditorLink>
  );
}
