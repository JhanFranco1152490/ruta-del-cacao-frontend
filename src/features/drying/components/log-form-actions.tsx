'use client';

import Link from 'next/link';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { Button, buttonVariants } from '@/components/ui/button';

// Guardar y cancelar de la pantalla de campo, en la barra fija del celular; si no se puede guardar
// ahora, el motivo va encima.
export function LogFormActions({
  submitLabel,
  isSaving,
  disabledMessage,
  cancelHref,
}: {
  submitLabel: string;
  isSaving: boolean;
  disabledMessage?: string | null;
  cancelHref: string;
}) {
  return (
    <div className="space-y-4">
      {disabledMessage && (
        <p className="font-bold text-warn" id="log-save-blocked">
          {disabledMessage}
        </p>
      )}
      <MobileActionBar>
        <Button
          aria-describedby={disabledMessage ? 'log-save-blocked' : undefined}
          className={CAPTURE_BUTTON_CLASS}
          disabled={isSaving || !!disabledMessage}
          size="office"
          type="submit"
        >
          {isSaving ? 'Guardando…' : submitLabel}
        </Button>
        <Link
          className={buttonVariants({
            size: 'office',
            variant: 'outline',
            className: CAPTURE_BUTTON_CLASS,
          })}
          href={cancelHref}
        >
          Cancelar
        </Link>
      </MobileActionBar>
    </div>
  );
}
