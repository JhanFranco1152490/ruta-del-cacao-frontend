import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

import type { FarmListItem } from '../farm-list-item';
import { FarmDiscardDialog } from './farm-discard-dialog';

// Acciones sobre una finca que sigue en el dispositivo: corregirla mientras está pendiente o
// con error, y descartarla solo cuando falló (una pendiente todavía puede llegar bien).
export function FarmQueueActions({ farm }: { farm: FarmListItem }) {
  if (farm.status !== 'pending' && farm.status !== 'error') return null;

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        aria-label={`Corregir ${farm.name}`}
        className={buttonVariants({ variant: 'outline', className: 'h-11' })}
        href={`/fincas/${farm.id}/editar`}
      >
        <Pencil aria-hidden="true" className="size-4" /> Corregir
      </Link>
      {farm.status === 'error' && <FarmDiscardDialog farm={farm} />}
    </div>
  );
}
