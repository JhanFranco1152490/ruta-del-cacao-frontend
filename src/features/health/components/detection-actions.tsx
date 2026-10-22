'use client';

import { CalendarPlus, Check, CircleSlash } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { ActionsMenu } from '@/components/actions-menu';
import { Button } from '@/components/ui/button';
import { MenuItem } from '@/components/ui/menu';
import { useSession } from '@/hooks/use-session';
import type { components } from '@/lib/api/schema';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import {
  type Detection,
  detectionName,
  detectionStatus,
} from '../detection-status';
import { ControlFormDialog, originOf } from './control-form-dialog';
import { NoControlNeededDialog } from './no-control-needed-dialog';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// Lo que quien programa puede hacer con una detección después del recorrido: programarle un control
// o registrar uno ya hecho, y, si alguien pidió que se lo programaran, decidir que no hace falta.
// Quien no programa no ve nada aquí.
export function DetectionActions({
  detection,
  monitoring,
  compact = false,
  menu = false,
  children,
}: {
  detection: Detection;
  monitoring: AgriculturalActivity;
  // En una lista: botones más bajos.
  compact?: boolean;
  // En celular: las acciones de control detrás de un menú «⋯», para que la fila no se apile en
  // tres botones.
  menu?: boolean;
  // Más botones de la misma fila (p. ej. «Detalle» en el historial): salen al mismo nivel que los
  // de las acciones y se acomodan juntos.
  children?: ReactNode;
}) {
  const { data: user } = useSession();
  const [open, setOpen] = useState<'scheduled' | 'done'>();
  const [deciding, setDeciding] = useState(false);
  if (!hasPermission(user, PERMISSIONS.ACTIVITIES_ADD)) return null;
  const canComplete = hasPermission(user, PERMISSIONS.ACTIVITIES_COMPLETE);
  const requested = detectionStatus(detection)?.kind === 'requested';

  const height = compact ? 'h-9 text-sm' : 'h-11';
  const dialogs = (
    <>
      {open && (
        <ControlFormDialog
          detection={detection}
          mode={open}
          origin={originOf(monitoring)}
          onClose={() => setOpen(undefined)}
        />
      )}
    </>
  );
  if (menu) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <ActionsMenu
          className="h-9"
          label={`Más acciones de ${detectionName(detection)}`}
        >
          <MenuItem onClick={() => setOpen('scheduled')}>
            <CalendarPlus aria-hidden="true" className="size-4" />
            Programar control
          </MenuItem>
          {canComplete && (
            <MenuItem onClick={() => setOpen('done')}>
              <Check aria-hidden="true" className="size-4" />
              Registrar control realizado
            </MenuItem>
          )}
          {requested && (
            <MenuItem onClick={() => setDeciding(true)}>
              <CircleSlash aria-hidden="true" className="size-4" />
              No requiere control
            </MenuItem>
          )}
        </ActionsMenu>
        {dialogs}
        {requested && (
          <NoControlNeededDialog
            control={{ open: deciding, onOpenChange: setDeciding }}
            detection={detection}
          />
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
      <Button
        className={height}
        onClick={() => setOpen('scheduled')}
        type="button"
        variant="action"
      >
        <CalendarPlus aria-hidden="true" className="size-4" /> Programar control
      </Button>
      {canComplete && (
        <Button
          className={height}
          onClick={() => setOpen('done')}
          type="button"
          variant="action"
        >
          <Check aria-hidden="true" className="size-4" /> Registrar control
          realizado
        </Button>
      )}
      {requested && <NoControlNeededDialog detection={detection} />}
      {children}
      {dialogs}
    </div>
  );
}
