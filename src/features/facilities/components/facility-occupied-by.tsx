import Link from 'next/link';

import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import { formatShortDayMonth } from '@/lib/format/dates';

import type { PostharvestFacility } from '../api';

// El lote que ocupa el elemento y desde cuándo, con enlace a su ficha para quien puede verla.
// En la tarjeta del celular el enlace queda sobre el botón que cubre la tarjeta.
export function FacilityOccupiedBy({
  facility,
  lotHref,
  align = 'start',
}: {
  facility: PostharvestFacility;
  lotHref?: (id: string) => string;
  align?: 'start' | 'end';
}) {
  if (!facility.occupied_by) return <span aria-label="Sin lote">—</span>;
  const { lot, since } = facility.occupied_by;
  return (
    <span
      className={`flex flex-col gap-0.5 ${align === 'end' ? 'items-end' : 'items-start'}`}
    >
      {lotHref ? (
        <Link
          className={`relative z-10 font-mono text-xs text-selva underline underline-offset-2 ${FOCUS_OUTLINE_CLASS}`}
          href={lotHref(lot.id)}
        >
          {lot.code}
        </Link>
      ) : (
        <span className="font-mono text-xs">{lot.code}</span>
      )}
      <span className="text-sm font-normal text-muted-foreground">
        desde el {formatShortDayMonth(since)}
      </span>
    </span>
  );
}
