'use client';

import { ChevronDown, KeyRound } from 'lucide-react';
import { useId, useState } from 'react';

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
  { role: 'Capataz de La Esperanza', email: 'capataz@example.com' },
  { role: 'Operario de El Mirador', email: 'operario@example.com' },
] as const;

// Plegado de entrada: el inicio de sesión queda limpio y quien evalúa lo abre con un toque. El
// título es el botón, así que el nombre de la región y el del botón son el mismo.
export function DemoAccounts({
  onUse,
}: {
  onUse: (email: string, password: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <section
      aria-labelledby="demo-accounts-title"
      className="rounded-md border border-info/30 bg-info-bg text-info"
    >
      <h2 id="demo-accounts-title" className="text-sm font-bold">
        <button
          aria-controls={bodyId}
          aria-expanded={open}
          className="flex min-h-11 w-full items-center gap-2 rounded-md px-3.5 py-2 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <KeyRound aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">Cuentas de demostración</span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
          />
        </button>
      </h2>
      {open && (
        <div className="motion-rise px-3.5 pb-3" id={bodyId}>
          <p className="text-xs leading-snug font-semibold">
            Los datos son de prueba. Contraseña de todas:{' '}
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
        </div>
      )}
    </section>
  );
}
