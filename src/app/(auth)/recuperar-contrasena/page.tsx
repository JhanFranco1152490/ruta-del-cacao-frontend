import { AuthShell } from '@/features/auth/components/auth-shell';
import { ResetRequestForm } from '@/features/auth/components/reset-request-form';

export default function ResetRequestPage() {
  return (
    <AuthShell
      eyebrow="Recupera tu acceso"
      title="Restablece tu contraseña"
      description="Escribe el correo asociado a tu cuenta. Si está registrado, te enviaremos un enlace válido por 30 minutos."
    >
      <ResetRequestForm />
    </AuthShell>
  );
}
