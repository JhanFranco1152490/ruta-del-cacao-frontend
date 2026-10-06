import { AuthShell } from '@/features/auth/components/auth-shell';
import { LoginForm } from '@/features/auth/components/login-form';
import { SignedInRedirect } from '@/features/auth/components/signed-in-redirect';

// El titular del panel de marca rota una vez al día (ver AuthShell); sin esto
// la página queda estática desde el build y nunca cambiaría en producción.
export const revalidate = 86400;

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Ingreso al sistema"
      title="Bienvenido de vuelta"
      description=""
    >
      <SignedInRedirect />
      <LoginForm />
    </AuthShell>
  );
}
