'use client';

import { cn } from 'cn';
import { RotateCw } from 'lucide-react';
import { useState } from 'react';

import { EditorLink } from '@/components/editor-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { notify } from '@/lib/notify';

import type { Fermentation } from '../api';
import { turnPath } from '../fermentation-paths';
import { pendingTurnsOf, type QueuedTurn } from '../turn-queue';
import { FinishFermentationButton } from './finish-fermentation-button';
import {
  StartFermentationDialog,
  type StartLot,
} from './start-fermentation-dialog';

// Lo que se hace con una fermentación en curso desde la ficha del lote. Registrar volteo sirve
// también sin conexión; corregir el inicio y finalizar, solo con ella. Finalizar deshabilitado dice
// por qué.
export function FermentationSectionActions({
  lot,
  fermentation,
  queued,
  canLogTurns,
  canManage,
  online,
  facilitiesHref,
}: {
  lot: StartLot;
  fermentation: Fermentation;
  queued: readonly QueuedTurn[];
  canLogTurns: boolean;
  canManage: boolean;
  online: boolean;
  facilitiesHref?: string;
}) {
  const [correcting, setCorrecting] = useState(false);
  const queuedCount = pendingTurnsOf(queued, lot.id).length;
  const turnCount = fermentation.turns.length;
  const canCorrectStart = turnCount + queuedCount === 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canLogTurns && (
          <EditorLink
            className={cn(buttonVariants({ size: 'office' }), 'max-sm:w-full')}
            href={turnPath(lot.id)}
          >
            <RotateCw aria-hidden="true" className="size-4" /> Registrar volteo
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
          <FinishFermentationButton
            className="max-sm:basis-full"
            fermentation={fermentation}
            online={online}
            queued={queued}
          />
        )}
      </div>
      {correcting && (
        <StartFermentationDialog
          facilitiesHref={facilitiesHref}
          fermentation={fermentation}
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
