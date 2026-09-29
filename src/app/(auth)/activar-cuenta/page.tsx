import type { Metadata } from 'next';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { ActivationConfirmForm } from '@/features/auth/components/activation-confirm-form';

export const metadata: Metadata = { referrer: 'no-referrer' };

export default async function ActivationPage({
  searchParams,
}: PageProps<'/activar-cuenta'>) {
  const { uid, token } = await searchParams;
  return (
    <AuthShell
      eyebrow="Bienvenido"
      title="Activa tu cuenta"
      description="Elige una contraseña segura para acceder a Ruta del Cacao."
    >
      <ActivationConfirmForm
        uid={typeof uid === 'string' ? uid : undefined}
        token={typeof token === 'string' ? token : undefined}
      />
    </AuthShell>
  );
}
