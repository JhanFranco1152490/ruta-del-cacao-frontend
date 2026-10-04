'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { StatusBadge } from '@/components/status-badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useSession } from '@/hooks/use-session';

import {
  type QueuedCharacterizationState,
  useQueuedCharacterizationState,
} from '../use-characterization-queue';

const BADGES = {
  pending: { label: 'Pendiente de sincronización', tone: 'info' },
  error: { label: 'Pendiente con error', tone: 'err' },
  synced: { label: 'Guardada en el servidor', tone: 'ok' },
} as const;

function describe(state: QueuedCharacterizationState, isOnline: boolean) {
  switch (state.status) {
    case 'synced':
      return 'ya quedó guardada en el servidor.';
    case 'error':
      return `quedó en este dispositivo, pero el servidor no la aceptó${
        state.errorMessage ? `: ${state.errorMessage}` : '.'
      } Corrígela para reenviarla.`;
    default:
      return isOnline
        ? 'quedó guardada en este dispositivo y se está enviando al servidor.'
        : 'quedó guardada en este dispositivo y se enviará al servidor cuando haya conexión.';
  }
}

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
  const state = useQueuedCharacterizationState(user?.id, plotId);
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
            {describe(state, sync.isOnline)}
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
