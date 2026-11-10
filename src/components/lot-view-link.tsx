import { cn } from 'cn';
import { Eye } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { Button, buttonVariants } from '@/components/ui/button';

// Atajo de icono a la ficha del lote. Con `disabledReason` queda como botón deshabilitado que dice
// por qué: un enlace deshabilitado no existe en HTML y seguiría llevando a la ficha.
export function LotViewLink({
  code,
  href,
  className,
  disabledReason = null,
}: {
  code: string;
  href: string;
  className?: string;
  disabledReason?: string | null;
}) {
  const label = `Ver el lote ${code}`;
  if (disabledReason !== null) {
    return (
      <Button
        aria-label={label}
        className={cn('px-3', className)}
        disabled
        size="office"
        title={disabledReason}
        variant="action"
      >
        <Eye aria-hidden="true" className="size-4" />
      </Button>
    );
  }
  return (
    <EditorLink
      aria-label={label}
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
