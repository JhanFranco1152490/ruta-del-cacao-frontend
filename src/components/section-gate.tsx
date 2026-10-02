'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { OnlineOnly } from '@/components/online-only';
import { PageNotice } from '@/components/page-notice';
import { navItemForPath } from '@/config/navigation';
import { useSession } from '@/hooks/use-session';
import { hasPermission } from '@/lib/permissions';
import type { NavItem } from '@/types/navigation';

// Cada sección del menú exige su permiso también al entrar escribiendo la dirección, y avisa si
// necesita conexión. Se lee del mismo registro que el menú: el permiso de una sección se escribe
// una sola vez y ninguna página nueva puede olvidar ninguna de las dos comprobaciones. El
// servidor autoriza cada petición de todos modos; esto solo decide qué mostrar.
export function SectionGate({
  items,
  children,
}: {
  items: readonly NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { data: user } = useSession();
  const section = navItemForPath(items, pathname);
  if (!section) return children;
  if (section.permission && !hasPermission(user, section.permission)) {
    return (
      <PageNotice
        title="No tienes permiso para ver esta sección"
        description="Si la necesitas, pide a quien administra tu cuenta que te asigne el permiso."
      />
    );
  }
  if (section.needsConnection) return <OnlineOnly>{children}</OnlineOnly>;
  return children;
}
