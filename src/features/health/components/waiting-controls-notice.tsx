'use client';

import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useWaitingDetections } from '../waiting-detections';
import { WaitingDetectionRow } from './waiting-detection-row';

const waitingText = (count: number) =>
  count === 1
    ? '1 detección espera un control'
    : `${count} detecciones esperan un control`;

// Arriba del calendario: cuántas detecciones esperan que alguien decida su control porque quien
// registró el monitoreo pidió que se lo programaran. No es una actividad, así que no va en
// Pendientes: dice que hay algo por decidir. Lo ve solo quien puede programar, que es quien puede
// resolverlo.
export function WaitingControlsNotice({
  producer,
  openActivity,
}: {
  producer: string | null;
  openActivity?: (activityId: string) => void;
}) {
  const { data: user } = useSession();
  const canSchedule = hasPermission(user, PERMISSIONS.ACTIVITIES_ADD);
  const { detections } = useWaitingDetections(user?.id, producer, {
    enabled: canSchedule,
  });
  const [open, setOpen] = useState(false);
  if (!canSchedule || detections.length === 0) return null;

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-warn/30 bg-warn-bg px-4 py-2 text-warn"
        role="status"
      >
        <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
        <p className="font-bold">{waitingText(detections.length)}</p>
        <Button
          className="h-10"
          onClick={() => setOpen(true)}
          type="button"
          variant="outline"
        >
          Ver
        </Button>
      </div>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detecciones que esperan un control</DialogTitle>
            <DialogDescription>
              Alguien pidió que se les programara un control. Prográmalo o
              decide que no hace falta.
            </DialogDescription>
          </DialogHeader>
          <ul
            aria-label="Detecciones que esperan un control"
            className="space-y-3"
          >
            {detections.map((detection) => (
              <WaitingDetectionRow
                detection={detection}
                key={detection.id}
                onOpenMonitoring={
                  openActivity &&
                  (() => {
                    setOpen(false);
                    openActivity(detection.monitoring.id);
                  })
                }
                producer={producer}
              />
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
