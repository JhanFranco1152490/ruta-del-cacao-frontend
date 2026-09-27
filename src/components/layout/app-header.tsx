import { CacaoMark } from '@/components/brand/cacao-mark';

export function AppHeader({
  email,
  onLogout,
  isLoggingOut,
  logoutFailed,
}: {
  email?: string;
  onLogout: () => void;
  isLoggingOut: boolean;
  logoutFailed: boolean;
}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-3 text-selva">
          <CacaoMark className="h-9 w-6 text-cobre" />
          <span className="font-serif text-xl sm:text-2xl">Ruta del Cacao</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-56 truncate text-sm text-muted-foreground sm:inline">
            {email}
          </span>
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="min-h-11 rounded-md border border-border bg-card px-4 text-sm font-bold text-cobre hover:bg-surface-alt focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre disabled:opacity-60"
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
