import { AuthShell } from '@/components/auth/auth-shell';
import { ResetRequestForm } from '@/components/auth/reset-request-form';

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
