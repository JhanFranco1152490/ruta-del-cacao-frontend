'use client';

import { MoveRight, PackageMinus, PackagePlus, PencilLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

import type { SectionPickControl } from '@/components/page-blocks/section-item';
import { SectionCard } from '@/components/page-blocks/section-card';
import { Button } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { todayInBogota } from '@/lib/format/dates';
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
import { warehouseSummary } from '../warehouse-summary';
import { WarehouseActionDialog } from './warehouse-action-dialog';
import { WarehouseLedgerTable } from './warehouse-ledger-table';
import { BalanceFigures, WarehousePlaceBand } from './warehouse-place-band';

export type WarehouseSectionLot = {
  id: string;
  status: LotStatus;
  warehouse: LotWarehouseDetail | null;
};

const ICONS: Record<LotStockAction, LucideIcon> = {
  ingresar: PackagePlus,
  salida: PackageMinus,
  mover: MoveRight,
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
export function WarehouseSection({
  lot,
  pick,
}: {
  lot: WarehouseSectionLot;
  pick?: SectionPickControl;
}) {
  const { data: user } = useSession();
  const online = useHasConnection();
  const can = warehousePermissionsOf(user);
  const reachesWarehouse =
    lot.status === 'classified' || lot.status === 'in_warehouse';
  const full = useLotStock(lot.id, reachesWarehouse && can.view && online);
  const [request, setRequest] = useState<DialogRequest>();
  if (!reachesWarehouse) return null;
  const picked = pick && { ...pick, summary: warehouseSummary(lot.warehouse) };

  const view = lot.warehouse
    ? warehouseSectionView(lot.warehouse, full.data, todayInBogota())
    : null;
  const offers = lotStockActions({
    status: lot.status,
    canCorrect: full.data?.entry?.can_correct ?? false,
    hasStock: view?.balances.some(({ depleted }) => !depleted) ?? false,
    online,
    can,
  });
  const onAction = (action: LotStockAction) =>
    setRequest({ action, lotId: lot.id });
  const actions = <SectionActions offers={offers} onAction={onAction} />;
  const dialog = request && (
    <WarehouseActionDialog
      onClose={() => setRequest(undefined)}
      request={request}
    />
  );

  if (!view) {
    return (
      <SectionCard accent="cobre" pick={picked} title="Bodega">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">Pendiente de ingreso.</p>
          {actions}
        </div>
        {dialog}
      </SectionCard>
    );
  }

  const move = offers.find(({ action }) => action === 'mover');
  const others = offers.filter(({ action }) => action !== 'mover');
  return (
    <SectionCard accent="cobre" pick={picked} title="Bodega">
      <div className="space-y-4">
        <WarehousePlaceBand
          action={
            move && (
              <Button
                disabled={move.disabledReason !== null}
                onClick={() => setRequest({ action: 'mover', lotId: lot.id })}
                size="office"
                title={move.disabledReason ?? undefined}
                variant="action"
              >
                <MoveRight aria-hidden="true" className="size-4" /> {move.label}
              </Button>
            )
          }
          place={view.place}
          since={view.since}
        />
        <BalanceFigures balances={view.balances} />
        {view.ledger && (
          <WarehouseLedgerTable
            ledger={view.ledger}
            onVoid={(exit) =>
              setRequest({ action: 'anular', lotId: lot.id, exitId: exit.id })
            }
            voidOfferOf={(exit) => exitVoidOffer(exit, online, can)}
          />
        )}
        {view.correctedBy && (
          <p className="text-sm text-muted-foreground">{view.correctedBy}</p>
        )}
        <SectionActions offers={others} onAction={onAction} />
      </div>
      {dialog}
    </SectionCard>
  );
}
