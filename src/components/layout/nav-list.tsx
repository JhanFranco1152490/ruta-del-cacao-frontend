'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from 'cn';

import { FOCUS_OUTLINE_ON_DARK_CLASS } from '@/components/ui/focus-outline';
import {
  groupNavItems,
  isActiveRoute,
  NAV_GROUP_LABELS,
  navItemForPath,
} from '@/config/navigation';
import type { NavItem } from '@/types/navigation';

import { useNavGroupFolding } from './use-nav-group-folding';

// Con más entradas que esto, los grupos empiezan plegados (menos el de la pantalla actual): la
// lista entera ya no cabe en una ventana de laptop. El productor ve 10 y la cuenta técnica, 13.
const FOLD_ABOVE = 10;

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
  const groupFolding = useNavGroupFolding(items.length > FOLD_ABOVE);
  const toggle = (href: string) =>
    setFolded((previous) => {
      const next = new Set(previous);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });

  if (items.length === 0) return null;
  const section = navItemForPath(items, pathname);
  const { sections, showHeadings } = groupNavItems(items);

  const renderItem = ({ href, label, icon: Icon, children = [] }: NavItem) => {
    const childActive = children.some((child) =>
      isActiveRoute(child.href, pathname),
    );
    // La sección sigue marcada mientras se está en una de sus tareas, pero la tarea es la
    // que lleva el énfasis.
    const inSection = section?.href === href;
    const active = inSection && !childActive;
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
              FOCUS_OUTLINE_ON_DARK_CLASS,
              active
                ? 'bg-crema text-selva'
                : inSection
                  ? 'bg-white/10 text-crema'
                  : 'text-crema/90 hover:bg-white/10 hover:text-crema',
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn('size-5', !active && 'text-oro')}
            />
            {label}
          </Link>
          {children.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={`${open ? 'Plegar' : 'Desplegar'} el submenú de ${label}`}
              onClick={() => toggle(href)}
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-md text-crema/90 hover:bg-white/10',
                FOCUS_OUTLINE_ON_DARK_CLASS,
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
          <ul className="mt-1 ml-5 space-y-1 border-l border-white/20 pl-3">
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
                      FOCUS_OUTLINE_ON_DARK_CLASS,
                      here
                        ? 'bg-crema text-selva'
                        : 'text-crema/90 hover:bg-white/10 hover:text-crema',
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
  };

  return (
    <nav aria-label="Principal">
      <p aria-hidden="true" className="section-label mb-3 px-3 !text-oro">
        Menú
      </p>
      <ul className="space-y-1">
        {sections.map(({ key, items: sectionItems }) => {
          if (!key || !showHeadings) return sectionItems.map(renderItem);
          // El grupo de la pantalla actual no se pliega, y plegado dice que la contiene.
          const holdsCurrent = sectionItems.some(
            (item) => section?.href === item.href,
          );
          const open = holdsCurrent || !groupFolding.isFolded(key);
          const listId = `nav-group-${key}`;
          return (
            <li
              className="mt-2 border-t border-white/10 pt-2 first:mt-0 first:border-t-0 first:pt-0"
              key={key}
            >
              <button
                type="button"
                aria-controls={listId}
                aria-expanded={open}
                aria-disabled={holdsCurrent || undefined}
                onClick={() => {
                  if (!holdsCurrent) groupFolding.toggle(key);
                }}
                className={cn(
                  'flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-crema',
                  !holdsCurrent && 'hover:bg-white/10',
                  FOCUS_OUTLINE_ON_DARK_CLASS,
                )}
              >
                <span className="text-xs font-bold tracking-wider uppercase">
                  {NAV_GROUP_LABELS[key]}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-4 transition-transform',
                    !open && '-rotate-90',
                  )}
                />
              </button>
              {open && (
                <ul className="mt-1 space-y-1" id={listId}>
                  {sectionItems.map(renderItem)}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
