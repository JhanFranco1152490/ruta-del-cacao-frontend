'use client';

import { cn } from 'cn';
import { ClipboardPen } from 'lucide-react';
import { useState } from 'react';

import { EditorLink } from '@/components/editor-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { notify } from '@/lib/notify';

import type { Drying } from '../api';
import { logPath } from '../drying-paths';
import { pendingLogsOf, type QueuedLog } from '../log-queue';
import { FinishDryingButton } from './finish-drying-button';
import { StartDryingDialog, type StartLot } from './start-drying-dialog';

// Lo que se hace con un secado en curso desde la ficha del lote. Registrar bitácora sirve también
// sin conexión; corregir el inicio y finalizar, solo con ella. Finalizar deshabilitado dice por qué.
export function DryingSectionActions({
  lot,
  drying,
  queued,
  canLog,
  canManage,
  online,
  facilitiesHref,
}: {
  lot: StartLot;
  drying: Drying;
  queued: readonly QueuedLog[];
  canLog: boolean;
  canManage: boolean;
  online: boolean;
  facilitiesHref?: string;
}) {
  const [correcting, setCorrecting] = useState(false);
  const queuedCount = pendingLogsOf(queued, lot.id).length;
  const canCorrectStart = drying.logs.length + queuedCount === 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canLog && (
          <EditorLink
            className={cn(buttonVariants({ size: 'office' }), 'max-sm:w-full')}
            href={logPath(lot.id)}
          >
            <ClipboardPen aria-hidden="true" className="size-4" /> Registrar
            bitácora
          </EditorLink>
        )}
        {canManage && canCorrectStart && (
          <Button
            disabled={!online}
            onClick={() => setCorrecting(true)}
            size="office"
            variant="action"
          >
            Corregir inicio
          </Button>
        )}
        {canManage && (
          <FinishDryingButton
            className="max-sm:basis-full"
            drying={drying}
            online={online}
            queued={queued}
          />
        )}
      </div>
      {correcting && (
        <StartDryingDialog
          drying={drying}
          facilitiesHref={facilitiesHref}
          lot={lot}
          onClose={() => setCorrecting(false)}
          onSaved={() => {
            setCorrecting(false);
            notify.success('Inicio corregido');
          }}
        />
      )}
    </div>
  );
}
