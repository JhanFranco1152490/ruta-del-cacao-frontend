'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { CacaoMark } from '@/components/brand/cacao-mark';
import { SIGN_IN_PATH } from '@/config/routes';
import { isUnauthorized } from '@/lib/api/errors';
import { hasPendingLogout } from '@/lib/offline/pending-logout';

import { useSession } from '../api';
import { SignedOutOffline } from './signed-out-offline';

// Protege todo lo que vive bajo (app): comprueba la sesión al entrar y cada vez que se
// revalida (foco, reconexión, un 401 en otra consulta), y lleva al inicio de sesión si no
// existe. El contenido protegido nunca se muestra mientras no haya sesión. Un fallo de red o
// del servidor al revalidar no reemplaza la pantalla (se perdería lo que la persona esté
// llenando): la pantalla de reintento solo aparece si la primera carga falló.
export function SessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const unauthorized = isUnauthorized(session.error);

  useEffect(() => {
    if (unauthorized) router.replace(SIGN_IN_PATH);
  }, [unauthorized, router]);

  if (session.isPending || unauthorized) {
    return (
      <main
        className="grid min-h-screen place-items-center bg-background"
        role="status"
      >
        <div className="text-center text-selva">
          <CacaoMark className="mx-auto h-14 w-10 animate-pulse text-cobre" />
          <p className="mt-4 font-bold">Validando tu sesión…</p>
        </div>
      </main>
    );
  }

  // Cerró sesión sin conexión y el servidor aún no pudo enterarse: no es un fallo al validar.
  if (session.isLoadingError && hasPendingLogout()) {
    return <SignedOutOffline onRetry={() => session.refetch()} />;
  }

  if (session.isLoadingError) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5">
        <div className="text-center text-selva">
          <p role="alert">
            No pudimos validar tu sesión. Revisa la conexión e inténtalo de
            nuevo.
          </p>
          <button
            type="button"
            className="mt-4 rounded-md border px-4 py-2 font-bold"
            onClick={() => session.refetch()}
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  return children;
}
