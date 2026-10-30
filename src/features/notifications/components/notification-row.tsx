import { cn } from 'cn';
import {
  Bell,
  Clock,
  Gauge,
  Hourglass,
  ShieldAlert,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { buttonVariants } from '@/components/ui/button';

import type { NotificationLook, NotificationView } from '../notification-text';

// El ícono y el color de cada tipo. El tipo siempre va escrito en el título: no se distinguen solo
// por el color.
const LOOK: Record<NotificationLook, { Icon: typeof Bell; className: string }> =
  {
    upcoming: { Icon: Clock, className: 'text-info' },
    delayed: { Icon: Hourglass, className: 'text-warn' },
    overdue: { Icon: TriangleAlert, className: 'text-err' },
    control: { Icon: ShieldAlert, className: 'text-warn' },
    pending: { Icon: Timer, className: 'text-warn' },
    deviation: { Icon: Gauge, className: 'text-warn' },
    generic: { Icon: Bell, className: 'text-muted-foreground' },
  };

const HIT_CLASS =
  'flex w-full gap-2 rounded-md p-3 text-left transition-colors hover:bg-surface-alt focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre';

// Una notificación de la bandeja. Toda la fila lleva a lo que avisa; un tipo sin enlace es un botón
// que solo la marca como leída. Si el aviso tiene una acción (registrar lo que falta), va como un
// segundo enlace debajo, dentro del mismo marco: un enlace dentro de otro no es válido. Sin leer:
// punto y fondo resaltado; crítica sin leer: borde y fondo de error. Si lo avisado ya no está en la
// condición del aviso, se ve atenuada.
export function NotificationRow({
  view,
  unread,
  critical,
  received,
  onOpen,
}: {
  view: NotificationView;
  unread: boolean;
  critical: boolean;
  received: string;
  onOpen: () => void;
}) {
  const { Icon, className } = LOOK[view.look];
  const content: ReactNode = (
    <>
      <span className="flex w-3 shrink-0 justify-center pt-1.5">
        {unread && (
          <span className="size-2 rounded-full bg-cobre">
            <span className="sr-only">Sin leer</span>
          </span>
        )}
      </span>
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-5 shrink-0', className)}
      />
      <span className="min-w-0 flex-1 space-y-0.5">
        {view.origin && (
          <span className="block text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {view.origin}
          </span>
        )}
        <span className="flex items-start justify-between gap-3">
          <span className="font-bold text-selva">
            {critical && unread && (
              <span className="sr-only">Importante: </span>
            )}
            {view.title}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {received}
          </span>
        </span>
        {view.subject && <span className="block text-sm">{view.subject}</span>}
        {view.detail && (
          <span className="block text-sm text-muted-foreground">
            {view.detail}
          </span>
        )}
      </span>
    </>
  );
  const frameClass = cn(
    'rounded-md border',
    critical && unread
      ? 'border-err bg-err-bg'
      : unread
        ? 'border-border bg-surface-alt'
        : 'border-border bg-card',
    view.stale && 'opacity-60',
  );
  const hit = (extra?: string) =>
    view.href ? (
      <Link className={cn(HIT_CLASS, extra)} href={view.href} onClick={onOpen}>
        {content}
      </Link>
    ) : (
      <button className={cn(HIT_CLASS, extra)} onClick={onOpen} type="button">
        {content}
      </button>
    );

  if (!view.action) return hit(frameClass);
  return (
    <div className={frameClass}>
      {hit()}
      {/* Alineado con el texto (punto, ícono y sus espacios) en pantallas anchas; en celular, a
          todo el ancho y de 48 px para el dedo. */}
      <div className="px-3 pb-3 sm:pl-15">
        <Link
          className={cn(
            buttonVariants({ size: 'office', variant: 'action' }),
            'h-12 w-full sm:h-11 sm:w-auto',
          )}
          href={view.action.href}
          onClick={onOpen}
        >
          {view.action.label}
        </Link>
      </div>
    </div>
  );
}
