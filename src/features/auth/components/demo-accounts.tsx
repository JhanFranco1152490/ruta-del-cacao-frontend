import { KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';

// Cuentas públicas para evaluar la aplicación durante el semestre. El backend las crea con su
// comando de datos de demostración, con estos mismos correos y contraseña: si cambian allá,
// cambian aquí. Se retiran (este archivo y su uso en el formulario) cuando la aplicación reciba
// datos reales.
const DEMO_PASSWORD = 'CacaoDemo2026';

const DEMO_ACCOUNTS = [
  {
    role: 'Administrador de la asociación',
    email: 'administrador@example.com',
  },
  { role: 'Productor', email: 'productor@example.com' },
] as const;

export function DemoAccounts({
  onUse,
}: {
  onUse: (email: string, password: string) => void;
}) {
  return (
    <section
      aria-labelledby="demo-accounts-title"
      className="rounded-md border border-info/30 bg-info-bg px-3.5 py-3 text-info"
    >
      <h2
        id="demo-accounts-title"
        className="flex items-center gap-2 text-sm font-bold"
      >
        <KeyRound aria-hidden="true" className="size-4 shrink-0" />
        Cuentas de demostración
      </h2>
      <p className="mt-1 text-xs leading-snug font-semibold">
        Los datos son de prueba. Contraseña de ambas:{' '}
        <span className="font-mono">{DEMO_PASSWORD}</span>
      </p>
      <ul className="mt-2.5 space-y-2">
        {DEMO_ACCOUNTS.map(({ role, email }) => (
          <li
            key={email}
            className="flex items-center justify-between gap-3 rounded-md bg-background/70 px-3 py-2"
          >
            <div className="min-w-0 text-xs">
              <p className="font-bold">{role}</p>
              <p className="truncate font-mono">{email}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Usar la cuenta ${role}`}
              onClick={() => onUse(email, DEMO_PASSWORD)}
            >
              Usar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
