'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold',
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
