'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { StatusBadge } from '@/components/status-badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useQueuedRecordState } from '@/hooks/use-queued-record-state';
import { useSession } from '@/hooks/use-session';
import { describeQueuedRecord } from '@/lib/offline/queued-record-text';

import { characterizationQueueId } from '../characterization-queue';

const BADGES = {
  pending: { label: 'Pendiente de sincronización', tone: 'info' },
  error: { label: 'Pendiente con error', tone: 'err' },
  synced: { label: 'Guardada en el servidor', tone: 'ok' },
} as const;

export function CharacterizationSavedPanel({
  plotId,
  plotCode,
  farmDetailPath,
  onCorrect,
}: {
  plotId: string;
  plotCode: string;
  farmDetailPath: string;
  onCorrect: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { data: user } = useSession();
  const state = useQueuedRecordState(user?.id, characterizationQueueId(plotId));
  const { status: sync } = useCaptureSyncStatus('caracterizaciones');
  const badge = BADGES[state.status];

  // El panel reemplaza al formulario: el foco va al título para que se anuncie el resultado y
  // el teclado no quede en un botón que ya no existe.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8">
      <section
        aria-labelledby="characterization-saved-title"
        className="space-y-5 rounded-[var(--radius-card)] bg-card p-6 shadow-card"
      >
        <CheckCircle2 aria-hidden="true" className="size-10 text-selva" />
        <div className="space-y-2">
          <h1
            className="text-3xl text-selva outline-none"
            id="characterization-saved-title"
            ref={titleRef}
            tabIndex={-1}
          >
            Caracterización guardada exitosamente
          </h1>
          {/* Cambia sola cuando la cola la envía: se anuncia sin mover el foco. */}
          <p aria-live="polite" className="text-muted-foreground">
            La caracterización de{' '}
            <strong className="text-foreground">{plotCode}</strong>{' '}
            {describeQueuedRecord(state, sync.isOnline)}
          </p>
        </div>
        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
        <div className="flex flex-col gap-3 sm:flex-row">
          {state.status === 'error' ? (
            <Button
              className={CAPTURE_BUTTON_CLASS}
              onClick={onCorrect}
              size="office"
              type="button"
            >
              Corregir caracterización
            </Button>
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
        </div>
      </section>
    </div>
  );
}
