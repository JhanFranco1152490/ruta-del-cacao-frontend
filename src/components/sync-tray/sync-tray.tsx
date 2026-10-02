'use client';

import { cn } from 'cn';
import { CloudOff, CloudUpload, LogIn, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { OfflineBanner } from '@/components/offline-banner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { QueueItem } from '@/lib/offline/db';
import type { SyncStatus } from '@/types/sync';

import { QueueItemGroup } from './queue-item-group';
import type { QueueView } from './queue-view';
import { syncAttention, type SyncAttentionKind } from './sync-attention';

const LOOK: Record<
  SyncAttentionKind,
  { Icon: typeof CloudOff; className: string }
> = {
  error: { Icon: TriangleAlert, className: 'text-err' },
  expired: { Icon: LogIn, className: 'text-warn' },
  offline: { Icon: CloudOff, className: 'text-info' },
  pending: { Icon: CloudUpload, className: 'text-info' },
};

// Indicador de la cabecera y bandeja con lo que sigue en el dispositivo, de cualquier recurso.
// El botón solo aparece cuando hay algo que contar; si lo último se envía con la bandeja
// abierta, la bandeja sigue abierta y lo dice.
export function SyncTray({
  status,
  items,
  views,
}: {
  status: SyncStatus;
  items: readonly QueueItem[] | undefined;
  views: readonly QueueView[];
}) {
  const [open, setOpen] = useState(false);
  const attention = syncAttention(status);
  const close = () => setOpen(false);
  const failed = items?.filter((item) => item.status === 'error') ?? [];
  const waiting = items?.filter((item) => item.status !== 'error') ?? [];
  const look = attention && LOOK[attention.kind];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {attention && look && (
        <SheetTrigger
          aria-label={attention.label}
          render={<Button variant="outline" className="h-11 gap-2 px-3" />}
        >
          <look.Icon
            aria-hidden="true"
            className={cn('size-5', look.className)}
          />
          {attention.count > 0 && (
            <span aria-hidden="true" className="font-bold">
              {attention.count}
            </span>
          )}
        </SheetTrigger>
      )}
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="font-serif text-xl text-selva">
            Registros del dispositivo
          </SheetTitle>
          <SheetDescription>
            Lo que guardaste en este dispositivo y todavía no llega al servidor.
          </SheetDescription>
        </SheetHeader>
        <OfflineBanner status={status} />
        <QueueItemGroup
          title="Requieren revisión"
          items={failed}
          views={views}
          onNavigate={close}
        />
        <QueueItemGroup
          title="Pendientes de enviar"
          items={waiting}
          views={views}
          onNavigate={close}
        />
        {items?.length === 0 && (
          <p className="text-muted-foreground">
            No hay registros pendientes en este dispositivo.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
