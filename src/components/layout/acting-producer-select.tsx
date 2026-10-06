'use client';

import { cn } from 'cn';
import { UserCog } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ProducerFilter } from '@/components/producer-filter';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NAV_ITEMS, navItemForPath } from '@/config/navigation';
import { useActingProducer } from '@/hooks/use-acting-producer';
import { useActingProducerSummary } from '@/hooks/use-acting-producer-summary';
import { useHasConnection } from '@/hooks/use-has-connection';
import { isApiError } from '@/lib/api/errors';
import { useProducerSummary } from '@/lib/api/producer-options';
import { fullName } from '@/lib/format/person-name';

// El productor bajo el que opera la cuenta técnica: solo para ella y solo en las secciones que
// trabajan bajo un productor. Siempre en el mismo lugar del encabezado; con uno elegido el botón
// cambia de color, para que se note que lo que se hace queda a nombre de ese productor.
export function ActingProducerSelect() {
  const section = navItemForPath(NAV_ITEMS, usePathname());
  const { producerId, choose, clear, isSuperuser } = useActingProducer();
  const summary = useActingProducerSummary();
  const chosen = useProducerSummary(producerId ?? undefined);
  const hasConnection = useHasConnection();
  const [open, setOpen] = useState(false);
  // El productor elegido que dejó de existir: se avisa y se abre la elección para escoger otro.
  const [vanishedId, setVanishedId] = useState<string | null>(null);

  const gone = isApiError(summary.error) && summary.error.status === 404;
  if (gone && producerId && vanishedId !== producerId) {
    setVanishedId(producerId);
    setOpen(true);
  }
  useEffect(() => {
    if (gone) clear();
  }, [gone, clear]);

  if (!isSuperuser || !section?.actsUnderProducer) return null;

  const name = summary.data ? fullName(summary.data) : '';
  const code = summary.data?.member_code;
  const label = producerId
    ? `Productor: ${[name, code].filter(Boolean).join(' · ')}`
    : 'Elegir productor';

  return (
    <>
      <Button
        variant="outline"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={cn(
          'h-11 max-w-72 gap-2 px-3',
          producerId &&
            'border-cobre bg-selva text-white hover:bg-selva hover:text-white',
        )}
      >
        <UserCog aria-hidden="true" className="size-5 shrink-0" />
        <span className="truncate">
          {producerId ? (
            <>
              <span className="hidden sm:inline">{name} · </span>
              {code}
            </>
          ) : (
            'Elegir productor'
          )}
        </span>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setVanishedId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Productor activo</DialogTitle>
            <DialogDescription>
              Fincas, usuarios y roles se registran y se editan a nombre del
              productor que elijas.
            </DialogDescription>
          </DialogHeader>
          {vanishedId && (
            <p role="status" className="text-sm font-bold text-err">
              El productor que habías elegido ya no existe. Elige otro.
            </p>
          )}
          {hasConnection ? (
            <ProducerFilter
              producer={producerId ?? undefined}
              selected={chosen}
              onSelect={(id) => {
                choose(id);
                setOpen(false);
              }}
              onClear={() => {
                clear();
              }}
            />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              Necesitas conexión para cambiar de productor.
            </p>
          )}
          {producerId && (
            <Button
              variant="outline"
              size="office"
              onClick={() => {
                clear();
                setOpen(false);
              }}
            >
              Quitar productor
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
