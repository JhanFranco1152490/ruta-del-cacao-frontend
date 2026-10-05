'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { useQueuedRecordState } from '@/hooks/use-queued-record-state';
import { useSession } from '@/hooks/use-session';
import { describeQueuedRecord } from '@/lib/offline/queued-record-text';

import { farmEditPath } from '../farm-paths';
import { useFarmSyncStatus } from '../use-farm-sync-status';
import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { FarmStatusBadge } from './farm-status-badge';

const BADGES = {
  synced: 'active',
  error: 'error',
  pending: 'pending',
} as const;

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
  const state = useQueuedRecordState(user?.id, farmId);
  const { status: sync } = useFarmSyncStatus();
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
