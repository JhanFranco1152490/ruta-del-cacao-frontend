'use client';

import { CheckCircle2, CloudOff } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { Button, buttonVariants } from '@/components/ui/button';

// Lo que sigue a guardar una cosecha. A diferencia de las demás altas de la app, que avisan y
// vuelven, aquí se queda en la pantalla: en campo se registran varias recolecciones seguidas, y
// registrar otra conserva la parcela, el recolector y la fecha.
export function HarvestSaved({
  summary,
  onDevice,
  formLot,
  onAnother,
  doneHref,
}: {
  // "117 kg de CCN-51 · P02 · La loma · 22 oct.".
  summary: string;
  // Quedó en la cola esperando conexión.
  onDevice: boolean;
  // Conformar el lote de esta cosecha: solo cuando ya llegó al servidor y hay conexión.
  formLot?: ReactNode;
  onAnother: () => void;
  // A dónde lleva Listo: la pantalla desde la que se abrió el registro.
  doneHref: string;
}) {
  const Icon = onDevice ? CloudOff : CheckCircle2;
  return (
    <section
      aria-labelledby="harvest-saved-title"
      className="space-y-6 rounded-(--radius) border bg-card p-6"
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className={onDevice ? 'mt-1 size-6 text-warn' : 'mt-1 size-6 text-ok'}
        />
        <div className="space-y-1">
          <h2 className="text-xl font-bold" id="harvest-saved-title">
            {onDevice
              ? 'Cosecha guardada en el teléfono'
              : 'Cosecha registrada'}
          </h2>
          <p>{summary}</p>
          {onDevice && (
            <p className="text-sm text-muted-foreground">
              Se enviará sola cuando vuelva la conexión.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          className={CAPTURE_BUTTON_CLASS}
          onClick={onAnother}
          size="office"
          type="button"
        >
          Registrar otra cosecha
        </Button>
        {formLot}
        <Link
          className={buttonVariants({
            size: 'office',
            variant: 'outline',
            className: CAPTURE_BUTTON_CLASS,
          })}
          href={doneHref}
        >
          Listo
        </Link>
      </div>
    </section>
  );
}
