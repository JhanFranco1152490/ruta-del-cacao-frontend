import { cn } from 'cn';
import type { ReactNode } from 'react';

import { type ModuleAccent, accentStyle } from './accent';

// El fondo de la cabecera de cada pantalla: un bloque de color que hace notar el título. El equipo
// eligió tres (2026-10-22): `selva` (verde muy oscuro), `bosque` (verde medio oscuro) y `claro`
// (blanco con un filete del acento del módulo). Contraste del texto (WCAG): blanco 13:1 en selva
// y 7.9:1 en bosque; el antetítulo en dorado claro (8.1:1 y 4.8:1).
export type HeroTone = 'selva' | 'bosque' | 'claro';

const TONES: Record<HeroTone, { box: string; dark: boolean; eyebrow: string }> =
  {
    selva: {
      box: 'bg-selva text-white',
      dark: true,
      eyebrow: 'text-[#e8c873]',
    },
    bosque: {
      box: 'bg-selva-2 text-white',
      dark: true,
      eyebrow: 'text-[#e8c873]',
    },
    claro: {
      box: 'bg-card shadow-card before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-[var(--mod)]',
      dark: false,
      eyebrow: 'text-[var(--mod)]',
    },
  };

// Sobre un banner oscuro los botones se adaptan solos según su variante: el principal pasa a
// blanco, los de contorno (`action`, `outline`) a contorno claro, y los que abren una confirmación
// (desactivar, eliminar), que traen un rojo translúcido que ahí se pierde, a fondo sólido (~6:1).
// `HERO_PRIMARY_CLASS` y `HERO_SECONDARY_CLASS` fuerzan uno u otro cuando la variante no basta.
export const HERO_PRIMARY_CLASS = 'hero-primary';
export const HERO_SECONDARY_CLASS = 'hero-secondary';

const DARK_BUTTONS = [
  '[&_.hero-primary]:border-white [&_.hero-primary]:bg-white [&_.hero-primary]:text-selva [&_.hero-primary]:hover:bg-crema',
  '[&_[class*=bg-primary]]:border-white [&_[class*=bg-primary]]:bg-white [&_[class*=bg-primary]]:text-selva [&_[class*=bg-primary]]:hover:bg-crema',
  '[&_.hero-secondary]:border-white/60 [&_.hero-secondary]:bg-transparent [&_.hero-secondary]:text-white [&_.hero-secondary]:hover:bg-white/10',
  '[&_[class*=bg-card]]:border-white/60 [&_[class*=bg-card]]:bg-transparent [&_[class*=bg-card]]:text-white [&_[class*=bg-card]]:hover:bg-white/10',
  '[&_[class*=bg-background]]:border-white/60 [&_[class*=bg-background]]:bg-transparent [&_[class*=bg-background]]:text-white [&_[class*=bg-background]]:hover:bg-white/10',
  '[&_[class*=bg-destructive]]:bg-err-bg [&_[class*=bg-destructive]]:text-err [&_[class*=bg-destructive]]:hover:bg-white',
].join(' ');

// La cabecera de una pantalla: qué es, sus datos de un vistazo y sus acciones. Va
// suelta: si debajo hay cifras, van en su propia franja (`StatStrip`), no pegadas a ella.
export function DetailHero({
  tone,
  accent,
  mark,
  eyebrow,
  title,
  description,
  chips,
  actions,
}: {
  tone: HeroTone;
  accent: ModuleAccent;
  // Lo que identifica de un vistazo cuando no lo dice el título (el código de una finca).
  mark?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  chips?: ReactNode;
  actions?: ReactNode;
}) {
  const style = TONES[tone];
  const { dark } = style;
  return (
    <section
      aria-label={title}
      className={cn(
        'motion-rise relative mt-4 overflow-hidden rounded-[var(--radius-card)] p-4 sm:p-6',
        style.box,
        !dark && 'pl-5 sm:pl-7',
      )}
      data-tone={dark ? 'oscuro' : 'claro'}
      style={accentStyle(accent)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-4">
          {mark && (
            <span
              aria-hidden="true"
              className={cn(
                'hidden size-16 shrink-0 place-items-center rounded-2xl font-serif text-2xl sm:grid',
                dark
                  ? 'bg-black/15 text-white ring-1 ring-white/30'
                  : 'bg-card text-[var(--mod)] ring-1 ring-border',
              )}
            >
              {mark}
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className={cn('section-label', style.eyebrow)}>
                {eyebrow}
                {/* En celular la marca no cabe junto al título: va con el antetítulo. */}
                {mark && (
                  <span aria-hidden="true" className="sm:hidden">
                    {' '}
                    · {mark}
                  </span>
                )}
              </p>
            )}
            <h1
              className={cn(
                'font-serif text-3xl leading-tight text-balance break-words sm:text-4xl',
                dark ? 'text-white' : 'text-selva',
              )}
            >
              {/* La marca se ve aparte, pero un lector de pantalla la oye con el título. */}
              {mark && (
                <>
                  <span className="sr-only">{mark} ·</span>{' '}
                </>
              )}
              {title}
            </h1>
            {description && (
              <p
                className={cn(
                  'mt-1 max-w-2xl',
                  dark ? 'text-white/85' : 'text-muted-foreground',
                )}
              >
                {description}
              </p>
            )}
            {chips && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {chips}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div
            className={cn(
              // En celular, menos relleno para que dos acciones quepan en una fila.
              'flex flex-wrap gap-2 max-sm:w-full max-sm:[&>*]:px-3',
              dark && DARK_BUTTONS,
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

// Un dato corto de la cabecera (código, lugar, fecha). Se adapta al fondo: sobre uno oscuro, texto
// blanco sobre un velo oscuro, que en bosque sube el contraste.
export function HeroChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-[0.9rem] border border-border bg-muted px-2.5 py-0.5 text-sm font-bold text-foreground tabular-nums in-data-[tone=oscuro]:border-white/30 in-data-[tone=oscuro]:bg-black/15 in-data-[tone=oscuro]:text-white in-data-[tone=oscuro]:[&_*]:text-white [&_svg]:size-3.5 [&_svg]:shrink-0">
      {children}
    </span>
  );
}
