import Link from 'next/link';
import type { ReactNode } from 'react';

import { CacaoMark } from '@/components/brand/cacao-mark';
import { HOME_PATH } from '@/config/routes';

export function AppHeader({
  actions,
  logoutFailed,
  mobileNav,
  sidebarToggle,
}: {
  actions?: ReactNode;
  logoutFailed: boolean;
  mobileNav?: ReactNode;
  sidebarToggle?: ReactNode;
}) {
  return (
    // Fijo: ahí viven el estado de la conexión, la bandeja de registros y la cuenta, que no deben
    // perderse de vista al desplazarse. z-40: sobre el contenido (los mapas se aíslan, ver
    // globals.css) y bajo los diálogos y menús (z-50). Sobre el verde el anillo de foco cobre no
    // se distingue: dentro del encabezado va en oro.
    <header className="sticky top-0 z-40 border-b border-white/10 bg-selva [&_*:focus-visible]:!outline-oro">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3 text-selva">
          {mobileNav}
          {sidebarToggle}
          <Link
            href={HOME_PATH}
            className="flex min-w-0 items-center gap-3 rounded-md text-crema focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-oro"
          >
            <CacaoMark className="h-9 w-6 shrink-0 text-[var(--amarillo-mazorca)]" />
            <span className="sr-only font-serif text-xl whitespace-nowrap min-[400px]:not-sr-only sm:text-2xl">
              Ruta del <span className="italic">Cacao</span>
            </span>
          </Link>
        </div>
        {/* Los botones son claros sobre el verde: su texto no hereda el crema del encabezado. */}
        <div className="flex items-center gap-2 text-foreground sm:gap-3">
          {actions}
        </div>
      </div>
      {logoutFailed && (
        <p
          role="alert"
          className="bg-err-bg px-4 py-2 text-sm text-err sm:px-8"
        >
          No pudimos cerrar tu sesión. Revisa la conexión e inténtalo de nuevo.
        </p>
      )}
    </header>
  );
}
