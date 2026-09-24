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
    <div className="relative min-h-dvh bg-background">
      <header className="absolute left-5 top-6 sm:left-10 lg:left-12 lg:top-10">
        <Link
          href="/"
          className="flex w-fit items-center gap-3 text-selva"
          aria-label="Ruta del Cacao, inicio"
        >
          <CacaoMark className="h-11 w-8 text-[var(--amarillo-mazorca)]" />
          <span className="font-serif text-3xl">Ruta del Cacao</span>
        </Link>
      </header>

      <main className="flex min-h-dvh items-center justify-center px-5 py-28 sm:px-10">
        <div className="w-full max-w-[480px]">
          <div className="text-center">
            <p className="section-label">{eyebrow}</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-selva sm:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">
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
