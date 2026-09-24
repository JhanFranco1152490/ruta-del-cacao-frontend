import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Ingreso al sistema"
      title="Bienvenido de vuelta"
      description=""
    >
      <LoginForm />
    </AuthShell>
  );
}
