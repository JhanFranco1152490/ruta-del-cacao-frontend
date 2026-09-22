import Link from 'next/link';
import type { ReactNode } from 'react';
import { CacaoMark } from '@/components/brand/cacao-mark';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="relative min-h-dvh bg-[var(--cream)]">
      <header className="absolute left-5 top-6 sm:left-10 lg:left-12 lg:top-10">
        <Link
          href="/"
          className="flex w-fit items-center gap-3 text-[var(--forest)]"
          aria-label="Ruta del Cacao, inicio"
        >
          <CacaoMark className="h-11 w-8 text-[var(--cacao-yellow)]" />
          <span className="font-[family-name:var(--font-cormorant)] text-3xl font-bold">
            Ruta del Cacao
          </span>
        </Link>
      </header>

      <main className="flex min-h-dvh items-center justify-center px-5 py-28 sm:px-10">
        <div className="w-full max-w-[480px]">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--copper)]">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-cormorant)] text-4xl font-bold leading-tight text-[var(--forest)] sm:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--muted)]">
                {description}
              </p>
            )}
          </div>
          <div className="mt-9">{children}</div>
        </div>
      </main>
    </div>
  );
}
