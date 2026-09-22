import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <AuthShell eyebrow="" title="Bienvenido de nuevo" description="">
      <LoginForm />
    </AuthShell>
  );
}
