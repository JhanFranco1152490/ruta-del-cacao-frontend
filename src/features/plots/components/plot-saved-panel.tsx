'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { Button, buttonVariants } from '@/components/ui/button';
import { useQueuedRecordState } from '@/hooks/use-queued-record-state';
import { useSession } from '@/hooks/use-session';
import { describeQueuedRecord } from '@/lib/offline/queued-record-text';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';

import { plotEditPath } from '../plot-paths';
import { PlotQueueBadge } from './plot-queue-badge';

const BADGES = {
  synced: 'synced',
  error: 'error',
  pending: 'pending',
} as const;

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
  const state = useQueuedRecordState(user?.id, plotId);
  const { status: sync } = useCaptureSyncStatus('parcelas');
  const badge = BADGES[state.status];
  const text = describeQueuedRecord(state, sync.isOnline);

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
