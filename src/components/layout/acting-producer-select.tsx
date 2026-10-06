'use client';

import { cn } from 'cn';
import { UserCog } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ProducerFilter } from '@/components/producer-filter';
import { NAV_ITEMS, navItemForPath } from '@/config/navigation';
import { useActingProducer } from '@/hooks/use-acting-producer';
import { useActingProducerSummary } from '@/hooks/use-acting-producer-summary';
import { useHasConnection } from '@/hooks/use-has-connection';
import { isApiError } from '@/lib/api/errors';
import { useProducerSummary } from '@/lib/api/producer-options';
import { fullName } from '@/lib/format/person-name';

// El productor bajo el que opera la cuenta técnica: solo para ella y solo en las secciones que
// trabajan bajo un productor. Es el propio campo del encabezado: se hace clic y la lista se
// despliega justo debajo, sin pasar por una ventana aparte. Con uno elegido el campo se resalta,
// para que se note que lo que se hace queda a nombre de ese productor.
export function ActingProducerSelect() {
  const section = navItemForPath(NAV_ITEMS, usePathname());
  const { producerId, choose, clear, isSuperuser } = useActingProducer();
  const summary = useActingProducerSummary();
  const chosen = useProducerSummary(producerId ?? undefined);
  const hasConnection = useHasConnection();
  // El productor elegido que dejó de existir: se avisa y se deja el campo libre para escoger otro.
  const [vanishedId, setVanishedId] = useState<string | null>(null);

  const gone = isApiError(summary.error) && summary.error.status === 404;
  if (gone && producerId && vanishedId !== producerId)
    setVanishedId(producerId);
  useEffect(() => {
    if (gone) clear();
  }, [gone, clear]);

  if (!isSuperuser || !section?.actsUnderProducer) return null;

  const name = summary.data ? fullName(summary.data) : '';
  const label = [name, summary.data?.member_code].filter(Boolean).join(' · ');

  return (
    <div className="relative">
      {hasConnection ? (
        <ProducerFilter
          compact
          label="Productor activo"
          placeholder="Elegir productor"
          producer={producerId ?? undefined}
          selected={chosen}
          onSelect={(id) => {
            setVanishedId(null);
            choose(id);
          }}
          onClear={() => clear()}
          className={cn(
            'w-44 min-[480px]:w-56 lg:w-80',
            producerId && 'rounded-md ring-2 ring-cobre',
          )}
        />
      ) : (
        // Sin conexión no se puede buscar otro productor: se sigue mostrando el elegido.
        <p
          title="Necesitas conexión para cambiar de productor."
          className={cn(
            'flex h-11 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm',
            producerId && 'border-cobre bg-selva font-bold text-white',
          )}
        >
          <UserCog aria-hidden="true" className="size-5 shrink-0" />
          <span className="truncate">
            {producerId ? `Productor: ${label}` : 'Sin productor elegido'}
          </span>
          <span className="sr-only">
            . Necesitas conexión para cambiar de productor.
          </span>
        </p>
      )}
      {vanishedId && (
        <p
          role="status"
          className="absolute top-full right-0 z-10 mt-2 w-72 rounded-md bg-err-bg px-3 py-2 text-sm font-bold text-err shadow-card"
        >
          El productor que habías elegido ya no existe. Elige otro.
        </p>
      )}
    </div>
  );
}
