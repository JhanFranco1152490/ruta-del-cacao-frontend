'use client';

import { cn } from 'cn';
import { Eye } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';

import { OFFLINE_LOT_REASON } from '../warehouse-actions';

// El atajo a la ficha de un lote. Sin conexión queda deshabilitado con su motivo: la ficha no
// guarda copia de los lotes de bodega y el enlace llevaría a una página que no abre.
export function LotEyeLink({ code, href }: { code: string; href: string }) {
  const online = useHasConnection();
  const label = `Ver el lote ${code}`;
  if (!online) {
    return (
      <Button
        aria-label={label}
        className="px-3"
        disabled
        size="office"
        title={OFFLINE_LOT_REASON}
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
      )}
      href={href}
    >
      <Eye aria-hidden="true" className="size-4" />
    </EditorLink>
  );
}
