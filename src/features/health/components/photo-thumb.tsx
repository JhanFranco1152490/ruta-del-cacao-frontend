'use client';

import { CloudUpload, ImageOff } from 'lucide-react';
import type { ReactNode } from 'react';

import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';

// Una miniatura de 96 px que abre la foto completa. `url` falta mientras la foto se carga o si no se
// pudo leer; `pending` marca la que espera en el dispositivo. `action` es lo que se puede hacer con
// ella (quitarla o eliminarla), al pie.
export function PhotoThumb({
  url,
  label,
  pending = false,
  unavailable = false,
  onOpen,
  action,
}: {
  url?: string;
  label: string;
  pending?: boolean;
  unavailable?: boolean;
  onOpen?: () => void;
  action?: ReactNode;
}) {
  return (
    <li className="w-24 space-y-1">
      <button
        aria-label={`Ver ${label}`}
        className={`relative flex size-24 items-center justify-center overflow-hidden rounded-md border border-border bg-muted ${FOCUS_OUTLINE_CLASS}`}
        disabled={!url || !onOpen}
        onClick={onOpen}
        type="button"
      >
        {url ? (
          // Una foto en memoria: el optimizador de imágenes no la puede servir.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="size-full object-cover" src={url} />
        ) : unavailable ? (
          <ImageOff
            aria-hidden="true"
            className="size-6 text-muted-foreground"
          />
        ) : null}
      </button>
      {pending && (
        <p className="flex items-center gap-1 text-xs font-bold text-info">
          <CloudUpload aria-hidden="true" className="size-3.5" />
          Pendiente de enviar
        </p>
      )}
      {unavailable && (
        <p className="text-xs text-muted-foreground">
          Sin copia en el teléfono
        </p>
      )}
      {action}
    </li>
  );
}
