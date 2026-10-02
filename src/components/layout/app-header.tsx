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
    <header className="border-b border-border bg-card">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3 text-selva">
          {mobileNav}
          {sidebarToggle}
          <Link
            href={HOME_PATH}
            className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre"
          >
            <CacaoMark className="h-9 w-6 shrink-0 text-cobre" />
            <span className="sr-only font-serif text-xl whitespace-nowrap min-[400px]:not-sr-only sm:text-2xl">
              Ruta del Cacao
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">{actions}</div>
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
