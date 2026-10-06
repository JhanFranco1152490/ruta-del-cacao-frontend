'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from 'cn';

import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import { isActiveRoute } from '@/config/navigation';
import type { NavItem } from '@/types/navigation';

export function NavList({
  items,
  onNavigate,
}: {
  items: readonly NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  // Las secciones cuyo submenú la persona plegó; empiezan todas abiertas.
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (href: string) =>
    setFolded((previous) => {
      const next = new Set(previous);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });

  if (items.length === 0) return null;

  return (
    <nav aria-label="Principal">
      <ul className="space-y-1">
        {items.map(({ href, label, icon: Icon, children = [] }) => {
          const childActive = children.some((child) =>
            isActiveRoute(child.href, pathname),
          );
          // La sección sigue marcada mientras se está en una de sus tareas, pero la tarea es la
          // que lleva el énfasis.
          const active = isActiveRoute(href, pathname) && !childActive;
          const inSection = isActiveRoute(href, pathname);
          // Se pliega a gusto, pero no se esconde la tarea en la que se está.
          const open = !folded.has(href) || childActive;
          return (
            <li key={href}>
              <div className="flex items-center gap-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  className={cn(
                    'flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-3 text-sm font-bold',
                    FOCUS_OUTLINE_CLASS,
                    active
                      ? 'bg-selva text-primary-foreground'
                      : inSection
                        ? 'bg-muted text-selva'
                        : 'text-selva hover:bg-muted',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {label}
                </Link>
                {children.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${open ? 'Plegar' : 'Desplegar'} el submenú de ${label}`}
                    onClick={() => toggle(href)}
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-md text-selva hover:bg-muted',
                      FOCUS_OUTLINE_CLASS,
                    )}
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        'size-4 transition-transform',
                        !open && '-rotate-90',
                      )}
                    />
                  </button>
                )}
              </div>
              {children.length > 0 && open && (
                <ul className="mt-1 ml-5 space-y-1 border-l border-border pl-3">
                  {children.map((child) => {
                    const here = isActiveRoute(child.href, pathname);
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          aria-current={here ? 'page' : undefined}
                          onClick={onNavigate}
                          className={cn(
                            'flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold',
                            FOCUS_OUTLINE_CLASS,
                            here
                              ? 'bg-selva text-primary-foreground'
                              : 'text-selva hover:bg-muted',
                          )}
                        >
                          <child.icon aria-hidden="true" className="size-4" />
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
