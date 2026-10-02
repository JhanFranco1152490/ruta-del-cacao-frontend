'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';

import { useFarmSyncStatus } from '../use-farm-sync-status';
import { type QueuedFarmState, useQueuedFarmState } from '../use-local-farms';
import { CAPTURE_BUTTON_CLASS } from './capture-field-class';
import { FarmStatusBadge } from './farm-status-badge';
import { farmEditPath } from '../farm-paths';

function describe(state: QueuedFarmState, isOnline: boolean) {
  switch (state.status) {
    case 'synced':
      return {
        badge: 'active',
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

export function FarmSavedPanel({
  farmId,
  name,
  onRegisterAnother,
}: {
  farmId: string;
  name: string;
  onRegisterAnother: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { data: user } = useSession();
  const state = useQueuedFarmState(user?.id, farmId);
  const { status: sync } = useFarmSyncStatus();
  const { badge, text } = describe(state, sync.isOnline);

  // El panel reemplaza al formulario: se lleva el foco al título para que el lector de
  // pantalla anuncie el resultado y el teclado no quede en un botón que ya no existe.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8">
      <section
        aria-labelledby="farm-saved-title"
        className="space-y-5 rounded-[var(--radius-card)] bg-card p-6 shadow-card"
      >
        <CheckCircle2 aria-hidden="true" className="size-10 text-selva" />
        <div className="space-y-2">
          <h1
            className="text-3xl text-selva outline-none"
            id="farm-saved-title"
            ref={titleRef}
            tabIndex={-1}
          >
            Finca registrada exitosamente
          </h1>
          {/* Cambia sola cuando la cola envía la finca: se anuncia sin mover el foco. */}
          <p aria-live="polite" className="text-muted-foreground">
            <strong className="text-foreground">{name}</strong> {text}
          </p>
        </div>
        <FarmStatusBadge status={badge} />
        <div className="flex flex-col gap-3 sm:flex-row">
          {state.status === 'error' ? (
            <Link
              className={buttonVariants({
                size: 'office',
                className: CAPTURE_BUTTON_CLASS,
              })}
              href={farmEditPath(farmId)}
            >
              Corregir finca
            </Link>
          ) : (
            <Link
              className={buttonVariants({
                size: 'office',
                className: CAPTURE_BUTTON_CLASS,
              })}
              href="/fincas"
            >
              Ver mis fincas
            </Link>
          )}
          <Button
            className={CAPTURE_BUTTON_CLASS}
            onClick={onRegisterAnother}
            size="office"
            type="button"
            variant="outline"
          >
            Registrar otra finca
          </Button>
        </div>
      </section>
    </div>
  );
}
