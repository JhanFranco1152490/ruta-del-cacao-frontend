import type { Metadata } from 'next';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { ResetConfirmForm } from '@/features/auth/components/reset-confirm-form';

// La URL trae el uid y el token de restablecimiento: sin referrer no viajan en la cabecera
// Referer de las peticiones que salen de esta página (navegación, precargas de enlaces).
export const metadata: Metadata = { referrer: 'no-referrer' };

export default async function ResetConfirmPage({
  searchParams,
}: PageProps<'/restablecer-contrasena'>) {
  const { uid, token } = await searchParams;

  return (
    <AuthShell
      eyebrow="Protege tu cuenta"
      title="Crea una nueva contraseña"
      description="Usa una contraseña segura que puedas recordar y que no utilices en otros servicios."
    >
      <ResetConfirmForm
        uid={typeof uid === 'string' ? uid : undefined}
        token={typeof token === 'string' ? token : undefined}
      />
    </AuthShell>
  );
}
