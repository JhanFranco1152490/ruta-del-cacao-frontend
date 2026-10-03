'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { Button, buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';

import { plotEditPath } from '../plot-paths';
import { type QueuedPlotState, useQueuedPlotState } from '../use-plot-queue';
import { PlotQueueBadge } from './plot-queue-badge';

function describe(state: QueuedPlotState, isOnline: boolean) {
  switch (state.status) {
    case 'synced':
      return {
        badge: 'synced',
        text: 'ya quedó guardada en el servidor.',
      } as const;
    case 'error':
      return {
        badge: 'error',
        text: `quedó en este dispositivo, pero el servidor no la aceptó${
          state.errorMessage ? `: ${state.errorMessage}` : '.'
        } Corrígela para reenviarla.`,
      } as const;
    default:
      return {
        badge: 'pending',
        text: isOnline
          ? 'quedó guardada en este dispositivo y se está enviando al servidor.'
          : 'quedó guardada en este dispositivo y se enviará al servidor cuando haya conexión.',
      } as const;
  }
}

export function PlotSavedPanel({
  plotId,
  farmId,
  farmDetailPath,
  code,
  onRegisterAnother,
}: {
  plotId: string;
  farmId: string;
  farmDetailPath: string;
  code: string;
  onRegisterAnother: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { data: user } = useSession();
  const state = useQueuedPlotState(user?.id, plotId);
  const { status: sync } = useCaptureSyncStatus('parcelas');
  const { badge, text } = describe(state, sync.isOnline);

  // El panel reemplaza al formulario: se lleva el foco al título para que el lector de
  // pantalla anuncie el resultado y el teclado no quede en un botón que ya no existe.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8">
      <section
        aria-labelledby="plot-saved-title"
        className="space-y-5 rounded-[var(--radius-card)] bg-card p-6 shadow-card"
      >
        <CheckCircle2 aria-hidden="true" className="size-10 text-selva" />
        <div className="space-y-2">
          <h1
            className="text-3xl text-selva outline-none"
            id="plot-saved-title"
            ref={titleRef}
            tabIndex={-1}
          >
            Parcela guardada con éxito
          </h1>
          {/* Cambia sola cuando la cola envía la parcela: se anuncia sin mover el foco. */}
          <p aria-live="polite" className="text-muted-foreground">
            <strong className="text-foreground">{code}</strong> {text}
          </p>
        </div>
        <PlotQueueBadge status={badge} />
        <div className="flex flex-col gap-3 sm:flex-row">
          {state.status === 'error' ? (
            <Link
              className={buttonVariants({
                size: 'office',
                className: CAPTURE_BUTTON_CLASS,
              })}
              href={plotEditPath(plotId, farmId)}
            >
              Corregir parcela
            </Link>
          ) : (
            <Link
              className={buttonVariants({
                size: 'office',
                className: CAPTURE_BUTTON_CLASS,
              })}
              href={farmDetailPath}
            >
              Volver a la finca
            </Link>
          )}
          <Button
            className={CAPTURE_BUTTON_CLASS}
            onClick={onRegisterAnother}
            size="office"
            type="button"
            variant="outline"
          >
            Registrar otra parcela
          </Button>
        </div>
      </section>
    </div>
  );
}
