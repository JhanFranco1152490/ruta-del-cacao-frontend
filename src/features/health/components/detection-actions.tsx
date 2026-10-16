'use client';

import { CalendarPlus, Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import type { components } from '@/lib/api/schema';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { type Detection, detectionStatus } from '../detection-status';
import { ControlFormDialog, originOf } from './control-form-dialog';
import { NoControlNeededDialog } from './no-control-needed-dialog';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// Lo que quien programa puede hacer con una detección después del recorrido: programarle un control
// o registrar uno ya hecho, y, si alguien pidió que se lo programaran, decidir que no hace falta.
// Quien no programa no ve nada aquí.
export function DetectionActions({
  detection,
  monitoring,
}: {
  detection: Detection;
  monitoring: AgriculturalActivity;
}) {
  const { data: user } = useSession();
  const [open, setOpen] = useState<'scheduled' | 'done'>();
  if (!hasPermission(user, PERMISSIONS.ACTIVITIES_ADD)) return null;
  const canComplete = hasPermission(user, PERMISSIONS.ACTIVITIES_COMPLETE);
  const requested = detectionStatus(detection)?.kind === 'requested';

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        className="h-11"
        onClick={() => setOpen('scheduled')}
        type="button"
        variant="action"
      >
        <CalendarPlus aria-hidden="true" className="size-4" /> Programar control
      </Button>
      {canComplete && (
        <Button
          className="h-11"
          onClick={() => setOpen('done')}
          type="button"
          variant="action"
        >
          <Check aria-hidden="true" className="size-4" /> Registrar control
          realizado
        </Button>
      )}
      {requested && <NoControlNeededDialog detection={detection} />}
      {open && (
        <ControlFormDialog
          detection={detection}
          mode={open}
          origin={originOf(monitoring)}
          onClose={() => setOpen(undefined)}
        />
      )}
    </div>
  );
}
