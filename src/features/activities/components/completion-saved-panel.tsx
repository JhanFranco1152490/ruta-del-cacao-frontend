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

import { completionQueueId } from '../completion-queue';

const DISPLAY = {
  pending: {
    title: 'Realización guardada en este dispositivo',
    badge: 'Realizada · pendiente de enviar',
    tone: 'info',
  },
  error: {
    title: 'El servidor no aceptó la realización',
    badge: 'Pendiente con error',
    tone: 'err',
  },
  synced: {
    title: 'Actividad registrada como realizada',
    badge: 'Realizada',
    tone: 'ok',
  },
} as const;

// Lo que le pasó a la realización recién guardada: sigue esperando conexión, llegó al servidor o
// este la rechazó. Cambia sola cuando la cola la envía.
export function CompletionSavedPanel({
  activityId,
  label,
  backPath,
  canCorrect,
  onCorrect,
}: {
  activityId: string;
  // Cómo se nombra la labor: "Fertilización · P-03".
  label: string;
  backPath: string;
  // Si corregir lo capturado sirve de algo; si no, el registro se descarta desde la bandeja.
  canCorrect: (errorCode: string | undefined) => boolean;
  onCorrect: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { data: user } = useSession();
  const state = useQueuedRecordState(user?.id, completionQueueId(activityId));
  const { status: sync } = useCaptureSyncStatus('realizaciones');
  const display = DISPLAY[state.status];

  // El panel reemplaza al formulario: el foco va al título para que se anuncie el resultado y
  // el teclado no quede en un botón que ya no existe.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8">
      <section
        aria-labelledby="completion-saved-title"
        className="space-y-5 rounded-[var(--radius-card)] bg-card p-6 shadow-card"
      >
        <CheckCircle2 aria-hidden="true" className="size-10 text-selva" />
        <div className="space-y-2">
          {/* Cambia sola cuando la cola la envía: se anuncia sin mover el foco. */}
          <h1
            aria-live="polite"
            className="text-3xl text-selva outline-none"
            id="completion-saved-title"
            ref={titleRef}
            tabIndex={-1}
          >
            {display.title}
          </h1>
          <p aria-live="polite" className="text-muted-foreground">
            La realización de{' '}
            <strong className="text-foreground">{label}</strong>{' '}
            {describeQueuedRecord(state, sync.isOnline)}
          </p>
        </div>
        <StatusBadge solid tone={display.tone}>
          {display.badge}
        </StatusBadge>
        <div className="flex flex-col gap-3 sm:flex-row">
          {state.status === 'error' && canCorrect(state.errorCode) && (
            <Button
              className={CAPTURE_BUTTON_CLASS}
              onClick={onCorrect}
              size="office"
              type="button"
            >
              Corregir realización
            </Button>
          )}
          <Link
            className={buttonVariants({
              size: 'office',
              variant: state.status === 'error' ? 'outline' : 'default',
              className: CAPTURE_BUTTON_CLASS,
            })}
            href={backPath}
          >
            Volver a Actividades
          </Link>
        </div>
      </section>
    </div>
  );
}
