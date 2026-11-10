'use client';

import { Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ActionsMenu } from '@/components/actions-menu';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { MenuItem } from '@/components/ui/menu';
import { farmLabel } from '@/lib/format/place-label';

import type { Warehouse } from '../api';
import type { Offer, WarehouseItemAction } from '../warehouse-actions';

const ICONS: Record<WarehouseItemAction, LucideIcon> = {
  editar: Pencil,
  activar: Power,
  desactivar: PowerOff,
  eliminar: Trash2,
};

// Una bodega: su nombre y su estado, su finca y si ya recibió ingresos. Con dos acciones van las
// dos a la vista; desde la tercera, la primera queda a la vista y las demás en el «⋯».
export function WarehouseCard({
  warehouse,
  offers,
  onAction,
}: {
  warehouse: Warehouse;
  offers: readonly Offer<WarehouseItemAction>[];
  onAction: (warehouse: Warehouse, action: WarehouseItemAction) => void;
}) {
  const [main, ...rest] = offers;
  const visible = offers.length <= 2 ? offers : [main];
  const hidden = offers.length <= 2 ? [] : rest;
  return (
    <li className="flex flex-col gap-3 rounded-(--radius-card) bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="font-bold break-words">{warehouse.name}</p>
          <p className="text-sm text-muted-foreground">
            {farmLabel(warehouse.farm)}
          </p>
        </div>
        <StatusBadge tone={warehouse.is_active ? 'ok' : 'warn'}>
          {warehouse.is_active ? 'Activa' : 'Inactiva'}
        </StatusBadge>
      </div>
      <p className="text-sm">
        {warehouse.in_use ? 'Ya recibió lotes' : 'Todavía sin lotes'}
      </p>
      {offers.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {visible.map((offer) => {
            const Icon = ICONS[offer.action];
            return (
              <Button
                aria-label={`${offer.label} ${warehouse.name}`}
                className="max-sm:flex-1"
                disabled={offer.disabledReason !== null}
                key={offer.action}
                onClick={() => onAction(warehouse, offer.action)}
                size="office"
                title={offer.disabledReason ?? undefined}
                variant={offer.danger ? 'destructive' : 'action'}
              >
                <Icon aria-hidden="true" className="size-4" />
                {offer.label}
              </Button>
            );
          })}
          {hidden.length > 0 && (
            <ActionsMenu label={`Más acciones de ${warehouse.name}`}>
              {hidden.map((offer) => {
                const Icon = ICONS[offer.action];
                return (
                  <MenuItem
                    className={offer.danger ? 'text-destructive' : undefined}
                    disabled={offer.disabledReason !== null}
                    key={offer.action}
                    onClick={() => onAction(warehouse, offer.action)}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {offer.label}
                  </MenuItem>
                );
              })}
            </ActionsMenu>
          )}
        </div>
      )}
    </li>
  );
}
