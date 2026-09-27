import type { ReactNode } from 'react';

import { CacaoMark } from '@/components/brand/cacao-mark';

export function AppHeader({
  email,
  onLogout,
  isLoggingOut,
  logoutFailed,
  mobileNav,
  sidebarToggle,
}: {
  email?: string;
  onLogout: () => void;
  isLoggingOut: boolean;
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
          <CacaoMark className="h-9 w-6 shrink-0 text-cobre" />
          <span className="sr-only font-serif text-xl whitespace-nowrap min-[400px]:not-sr-only sm:text-2xl">
            Ruta del Cacao
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-56 truncate text-sm text-muted-foreground sm:inline">
            {email}
          </span>
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="min-h-11 shrink-0 rounded-md border border-border bg-card px-3 text-sm font-bold whitespace-nowrap text-cobre hover:bg-surface-alt focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre disabled:opacity-60 sm:px-4"
          >
            Cerrar sesión
          </button>
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
