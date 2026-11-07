'use client';

import { PackageMinus, PackagePlus, PencilLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

import {
  KeyValue,
  KeyValues,
  SectionCard,
} from '@/components/page-blocks/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import type { LotStatus } from '@/lib/lot-status';

import type { LotWarehouseDetail } from '../api';
import type { DialogRequest } from '../dialog-request';
import { useLotStock } from '../queries';
import {
  exitVoidOffer,
  type LotStockAction,
  lotStockActions,
  type Offer,
  warehousePermissionsOf,
} from '../warehouse-actions';
import { warehouseSectionView } from '../warehouse-section-view';
import { StockExitHistory } from './stock-exit-history';
import { WarehouseActionDialog } from './warehouse-action-dialog';

export type WarehouseSectionLot = {
  id: string;
  status: LotStatus;
  warehouse: LotWarehouseDetail | null;
};

const ICONS: Record<LotStockAction, LucideIcon> = {
  ingresar: PackagePlus,
  salida: PackageMinus,
  corregir: PencilLine,
};

// Las acciones del lote en bodega: la primera es la principal. Sin conexión se ven deshabilitadas,
// con el motivo debajo.
function SectionActions({
  offers,
  onAction,
}: {
  offers: readonly Offer<LotStockAction>[];
  onAction: (action: LotStockAction) => void;
}) {
  if (offers.length === 0) return null;
  const reason = offers[0].disabledReason;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {offers.map((offer, index) => {
          const Icon = ICONS[offer.action];
          return (
            <Button
              disabled={reason !== null}
              key={offer.action}
              onClick={() => onAction(offer.action)}
              size="office"
              variant={index === 0 ? 'default' : 'action'}
            >
              <Icon aria-hidden="true" className="size-4" /> {offer.label}
            </Button>
          );
        })}
      </div>
      {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
    </div>
  );
}

// La sección Bodega de la ficha de un lote, después de Calidad, desde que el lote está Clasificado.
// Lo que trae el lote lo ve cualquiera; quien consulta existencias ve además quién ingresó, las
// salidas y las acciones, que abren su formulario aquí mismo.
export function WarehouseSection({ lot }: { lot: WarehouseSectionLot }) {
  const { data: user } = useSession();
  const online = useHasConnection();
  const can = warehousePermissionsOf(user);
  const reachesWarehouse =
    lot.status === 'classified' || lot.status === 'in_warehouse';
  const full = useLotStock(lot.id, reachesWarehouse && can.view && online);
  const [request, setRequest] = useState<DialogRequest>();
  if (!reachesWarehouse) return null;

  const view = lot.warehouse
    ? warehouseSectionView(lot.warehouse, full.data)
    : null;
  const offers = lotStockActions({
    status: lot.status,
    canCorrect: full.data?.entry?.can_correct ?? false,
    hasStock: view?.balances.some(({ depleted }) => !depleted) ?? false,
    online,
    can,
  });
  const actions = (
    <SectionActions
      offers={offers}
      onAction={(action) => setRequest({ action, lotId: lot.id })}
    />
  );
  const dialog = request && (
    <WarehouseActionDialog
      onClose={() => setRequest(undefined)}
      request={request}
    />
  );

  if (!view) {
    return (
      <SectionCard accent="cobre" title="Bodega">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">Pendiente de ingreso.</p>
          {actions}
        </div>
        {dialog}
      </SectionCard>
    );
  }

  return (
    <SectionCard accent="cobre" title="Bodega">
      <div className="space-y-4">
        <KeyValues>
          {view.entry.map(({ label, value }) => (
            <KeyValue key={label} label={label}>
              {value}
            </KeyValue>
          ))}
        </KeyValues>
        {(view.enteredBy || view.correctedBy) && (
          <div className="space-y-0.5 text-sm text-muted-foreground">
            {view.enteredBy && <p>{view.enteredBy}</p>}
            {view.correctedBy && <p>{view.correctedBy}</p>}
          </div>
        )}
        <h3 className="font-bold text-selva">Existencias</h3>
        <ul aria-label="Existencias del lote" className="space-y-1">
          {view.balances.map((balance) => (
            <li
              className="flex flex-wrap items-center gap-2 tabular-nums"
              key={balance.grade}
            >
              {balance.text}
              {balance.depleted && (
                <StatusBadge tone="warn">Agotado</StatusBadge>
              )}
            </li>
          ))}
        </ul>
        {view.exits && (
          <>
            <h3 className="font-bold text-selva">Salidas</h3>
            <StockExitHistory
              lines={view.exits}
              onVoid={(exit) =>
                setRequest({ action: 'anular', lotId: lot.id, exitId: exit.id })
              }
              voidOfferOf={(exit) => exitVoidOffer(exit, online, can)}
            />
          </>
        )}
        {actions}
      </div>
      {dialog}
    </SectionCard>
  );
}
