'use client';

import { PageHeader } from '@/components/page-header';
import { PageNotice } from '@/components/page-notice';
import { useSession } from '@/hooks/use-session';

import { AssociationAccessCard } from './association-access-card';

// La sección del productor: hoy, si la asociación puede gestionar las cuentas y los roles de su
// equipo. Es el lugar para los datos del productor que vengan después.
export function MyProducerScreen() {
  const { data: user } = useSession();
  // Hasta saber de quién es la cuenta no se consulta nada.
  if (!user) return null;
  // Un superusuario recibe todos los permisos, también este, sin tener productor propio: el
  // interruptor no le sirve, así que ni se muestra ni se consulta.
  if (!user.producer_id) {
    return (
      <PageNotice
        title="Esta sección es para las cuentas de un productor"
        description="Tu cuenta no está vinculada a ningún productor."
      />
    );
  }
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Productor"
        title="Mi productor"
        description="Decide si la asociación puede gestionar las cuentas y los roles de tu equipo."
      />
      <div className="mt-8">
        <AssociationAccessCard />
      </div>
    </div>
  );
}
