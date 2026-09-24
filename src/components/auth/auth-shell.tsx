import Link from 'next/link';
import type { ReactNode } from 'react';
import { CacaoMark } from '@/components/brand/cacao-mark';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

function Brand({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex w-fit items-center gap-3 ${className}`}
      aria-label="Ruta del Cacao, inicio"
    >
      <CacaoMark className="h-11 w-8 text-[var(--amarillo-mazorca)]" />
      <span className="font-serif text-3xl">
        Ruta del <span className="italic">Cacao</span>
      </span>
    </Link>
  );
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-dvh bg-background lg:flex">
      <aside className="relative hidden w-[43%] max-w-[620px] shrink-0 flex-col overflow-hidden bg-selva p-10 text-primary-foreground lg:flex xl:p-12">
        <svg
          aria-hidden="true"
          viewBox="0 0 300 200"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full opacity-30"
        >
          <g fill="none" stroke="var(--oro)" strokeWidth="1.5">
            <path d="M-10 170 C60 150 120 120 200 60 S290 10 320 0" />
            <path d="M40 160 C50 130 80 120 100 126 C90 148 66 162 40 160Z M40 160 C60 144 78 134 98 127" />
            <path d="M120 118 C130 88 160 78 180 84 C170 106 146 120 120 118Z M120 118 C140 102 158 92 178 85" />
            <path d="M190 70 C200 40 230 30 250 36 C240 58 216 72 190 70Z M190 70 C210 54 228 44 248 37" />
            <path d="M250 32 C260 2 290 -8 310 -2 C300 20 276 34 250 32Z M250 32 C270 16 288 6 308 -1" />
          </g>
        </svg>
        <Brand className="relative text-crema" />
        <h2 className="relative mt-auto max-w-md font-serif text-[46px] leading-[1.08]">
          La ruta del cacao de{' '}
          <span className="italic">Norte de Santander</span>, registrada paso a
          paso.
        </h2>
        <p className="relative mt-10 text-[13px] text-primary-foreground/70">
          Proyecto UFPS 2026
        </p>
      </aside>

      <main className="flex min-h-dvh flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10">
        <Brand className="mb-8 text-selva lg:hidden" />
        <div className="w-full max-w-[420px] rounded-xl bg-card p-8 shadow-card">
          {eyebrow && <p className="section-label">{eyebrow}</p>}
          <h1 className="mt-1.5 font-serif text-[34px] leading-tight text-selva">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-[15px] leading-[1.45] text-muted-foreground">
              {description}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
