'use client';

import { BellOff, BellRing, Smartphone } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';
import {
  useDisablePush,
  useEnablePush,
  usePushConfig,
  usePushState,
} from '@/hooks/use-push-notices';
import { notify } from '@/lib/notify';

const NEEDS_CONNECTION_ID = 'push-needs-connection';

function Card({
  Icon,
  children,
  action,
}: {
  Icon: typeof BellRing;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-alt p-3">
      <Icon aria-hidden="true" className="size-5 shrink-0 text-selva" />
      <div className="min-w-0 flex-1 space-y-0.5 text-sm">{children}</div>
      {action}
    </div>
  );
}

// En Mi cuenta la tarjeta lleva su sección con título; si no hay tarjeta, tampoco hay título.
function AccountSection({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4">
      <h3 className="font-bold text-selva">Avisos en este dispositivo</h3>
      {children}
    </section>
  );
}

// Los avisos en este dispositivo, con la app cerrada. En el panel de notificaciones solo aparece
// mientras hay algo por decidir (y lo que resultó de decidirlo ahí); en Mi cuenta, siempre, para
// poder desactivarlos. No aparece si el navegador no los recibe o el servidor no los tiene
// configurados.
function usePushNoticeContent(place: 'panel' | 'account'): ReactNode {
  const hasConnection = useHasConnection();
  const state = usePushState();
  // La llave solo se pide si el navegador puede recibir avisos.
  const config = usePushConfig({
    enabled: hasConnection && !!state.data && state.data !== 'unsupported',
  });
  const enable = useEnablePush();
  const disable = useDisablePush();
  // Lo que la persona decidió aquí mismo se sigue mostrando en el panel, para que vea el resultado.
  const [decided, setDecided] = useState(false);
  const publicKey = config.data?.public_key;

  if (!publicKey || !state.data || state.data === 'unsupported') return null;
  if (
    place === 'panel' &&
    !decided &&
    ['active', 'blocked'].includes(state.data)
  ) {
    return null;
  }

  const needsConnection = hasConnection ? undefined : NEEDS_CONNECTION_ID;
  const offlineNote = !hasConnection && (
    <p className="text-muted-foreground" id={NEEDS_CONNECTION_ID}>
      Activar y desactivar los avisos necesita conexión.
    </p>
  );

  switch (state.data) {
    case 'ios-not-installed':
      return (
        <Card Icon={Smartphone}>
          <p>
            Para recibir avisos en el iPhone, agrega la app a la pantalla de
            inicio (Compartir → Agregar a inicio).
          </p>
        </Card>
      );
    case 'blocked':
      return (
        <Card Icon={BellOff}>
          <p>
            Los avisos están bloqueados en este navegador. Puedes activarlos en
            su configuración.
          </p>
        </Card>
      );
    case 'active':
      return (
        <Card
          Icon={BellRing}
          action={
            place === 'account' && (
              <Button
                aria-describedby={needsConnection}
                disabled={!hasConnection || disable.isPending}
                onClick={() =>
                  disable.mutate(undefined, {
                    onError: () =>
                      notify.error(
                        'No fue posible desactivar los avisos. Inténtalo nuevamente.',
                      ),
                  })
                }
                size="office"
                type="button"
                variant="outline"
              >
                Desactivar
              </Button>
            )
          }
        >
          <p className="font-bold">Avisos activados en este dispositivo</p>
          {place === 'account' && offlineNote}
        </Card>
      );
    case 'prompt':
      return (
        <Card
          Icon={BellRing}
          action={
            <Button
              aria-describedby={needsConnection}
              disabled={!hasConnection || enable.isPending}
              onClick={() =>
                enable.mutate(publicKey, {
                  onSuccess: () => setDecided(true),
                  onError: () =>
                    notify.error(
                      'No fue posible activar los avisos. Inténtalo nuevamente.',
                    ),
                })
              }
              size="office"
              type="button"
              variant="action"
            >
              Activar
            </Button>
          }
        >
          <p className="font-bold">Recibe los avisos en este dispositivo</p>
          <p className="text-muted-foreground">
            Te llegan aunque la app esté cerrada.
          </p>
          {offlineNote}
        </Card>
      );
  }
}

export function PushNoticeCard({ place }: { place: 'panel' | 'account' }) {
  const content = usePushNoticeContent(place);
  if (!content || place === 'panel') return content;
  return <AccountSection>{content}</AccountSection>;
}
