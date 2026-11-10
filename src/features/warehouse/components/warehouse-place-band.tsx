import { MapPin } from 'lucide-react';
import type { ReactNode } from 'react';

import { StatusBadge } from '@/components/status-badge';

import type { BalanceCard } from '../warehouse-section-view';

// Dónde está el cacao hoy y desde cuándo, con la acción de moverlo a la derecha.
export function WarehousePlaceBand({
  place,
  since,
  action,
}: {
  place: string;
  since: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[var(--mod-tint)] p-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--mod)] text-white"
      >
        <MapPin className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-selva">{place}</p>
        <p className="text-sm text-muted-foreground">{since}</p>
      </div>
      {action}
    </div>
  );
}

// Lo que queda de cada calibre, en grande.
export function BalanceFigures({ balances }: { balances: BalanceCard[] }) {
  return (
    <ul
      aria-label="Existencias del lote"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {balances.map((balance) => (
        <li className="border-l-4 border-[var(--mod)] pl-3" key={balance.grade}>
          <p className="font-serif text-3xl leading-tight text-selva tabular-nums">
            {balance.kilos}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {balance.caption}
            {balance.depleted && <StatusBadge tone="warn">Agotado</StatusBadge>}
          </p>
        </li>
      ))}
    </ul>
  );
}
