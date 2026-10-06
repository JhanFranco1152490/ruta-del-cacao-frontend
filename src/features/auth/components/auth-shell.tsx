import Link from 'next/link';
import type { ReactNode } from 'react';
import { BotanicalVine } from '@/components/brand/botanical-vine';
import { CacaoMark } from '@/components/brand/cacao-mark';
import { HOME_PATH } from '@/config/routes';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

function Brand({ className = '' }: { className?: string }) {
  return (
    <Link
      href={HOME_PATH}
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

type Headline = { pre: string; italic: string; post: string };

const ASIDE_HEADLINES: Headline[] = [
  {
    pre: 'La ruta del cacao de ',
    italic: 'Norte de Santander',
    post: ', registrada paso a paso.',
  },
  {
    pre: 'De la parcela a la bodega: la trazabilidad del cacao de ',
    italic: 'Norte de Santander',
    post: '.',
  },
  {
    pre: 'Cada lote de cacao, con su historia completa, de la ',
    italic: 'finca',
    post: ' a la venta.',
  },
  {
    pre: 'El cacao de ',
    italic: 'Norte de Santander',
    post: ', documentado desde la primera cosecha.',
  },
  {
    pre: 'El cacao de la asociación, con el respaldo de ',
    italic: 'cada productor',
    post: '.',
  },
];

function todaysHeadline() {
  const now = new Date();
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const startOfToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const dayOfYear = Math.floor((startOfToday - startOfYear) / 86_400_000);
  return ASIDE_HEADLINES[dayOfYear % ASIDE_HEADLINES.length];
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  const headline = todaysHeadline();

  return (
    <div className="h-dvh overflow-hidden bg-background lg:flex">
      <aside className="relative hidden w-[43%] max-w-[620px] shrink-0 flex-col overflow-hidden bg-selva p-10 text-primary-foreground lg:flex xl:p-12">
        <BotanicalVine className="absolute inset-0 size-full opacity-30" />
        <Brand className="relative text-crema" />
        <h2 className="relative mt-auto max-w-md font-serif text-[46px] leading-[1.08]">
          {headline.pre}
          <span className="italic">{headline.italic}</span>
          {headline.post}
        </h2>
      </aside>

      <main className="flex h-dvh flex-1 flex-col items-center justify-center px-5 py-6 sm:px-10">
        <Brand className="mb-5 text-selva lg:hidden" />
        <div className="w-full max-w-[420px] rounded-xl bg-card p-7 shadow-card">
          {eyebrow && <p className="section-label">{eyebrow}</p>}
          <h1 className="mt-1.5 font-serif text-[34px] leading-tight text-selva">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-[15px] leading-[1.45] text-muted-foreground">
              {description}
            </p>
          )}
          <div className="mt-5">{children}</div>
        </div>
      </main>
    </div>
  );
}
