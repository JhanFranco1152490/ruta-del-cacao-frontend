'use client';

import type { ReactNode } from 'react';

import { StatusBadge } from '@/components/status-badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatShortDayMonth } from '@/lib/format/dates';
import { FACILITY_TYPES, facilityStatus } from '@/lib/facility-labels';

import type { PostharvestFacility } from '../api';
import { capacityText } from '../facility-form';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right font-bold">{children}</dd>
    </div>
  );
}

// En celular, tocar la tarjeta de un elemento abre esta hoja con sus datos y sus acciones. No hay
// pantalla de detalle: el elemento tiene pocos datos y todos caben aquí.
export function FacilitySheet({
  facility,
  farmName,
  actions,
  onClose,
}: {
  facility: PostharvestFacility;
  farmName: string;
  actions?: ReactNode;
  onClose: () => void;
}) {
  const type = FACILITY_TYPES[facility.facility_type];
  const status = facilityStatus(facility.status, facility.facility_type);
  const occupiedBy = facility.occupied_by;
  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>
            {type.label} {facility.name}
          </SheetTitle>
          <SheetDescription>{farmName}</SheetDescription>
        </SheetHeader>
        <dl className="px-4">
          <Fact label="Capacidad">
            {capacityText(facility.capacity_kg)} de cacao en baba
          </Fact>
          <Fact label="Estado">
            <StatusBadge icon={status.Icon} tone={status.tone}>
              {status.label}
            </StatusBadge>
          </Fact>
          <Fact label="Ocupado por">
            {occupiedBy ? (
              <span className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-xs">{occupiedBy.lot.code}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  desde el {formatShortDayMonth(occupiedBy.since)}
                </span>
              </span>
            ) : (
              'Ninguno'
            )}
          </Fact>
        </dl>
        {actions && (
          <div className="flex flex-col gap-2 px-4 pb-4">{actions}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
