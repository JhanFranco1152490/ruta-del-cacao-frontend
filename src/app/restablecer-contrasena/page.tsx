import { AuthShell } from '@/components/auth/auth-shell';
import { ResetConfirmForm } from '@/components/auth/reset-confirm-form';

export default async function ResetConfirmPage({
  searchParams,
}: PageProps<'/restablecer-contrasena'>) {
  const { token } = await searchParams;
  const resetToken = typeof token === 'string' ? token : '';

  return (
    <AuthShell
      eyebrow="Protege tu cuenta"
      title="Crea una nueva contraseña"
      description="Usa una contraseña segura que puedas recordar y que no utilices en otros servicios."
    >
      <ResetConfirmForm token={resetToken} />
    </AuthShell>
  );
}
