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
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActiveRoute(href, pathname);
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
                    : 'text-selva hover:bg-muted',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
