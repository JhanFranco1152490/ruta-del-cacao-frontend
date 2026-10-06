import type { LucideIcon } from 'lucide-react';

import type { Permission } from '@/lib/permissions';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Sin permiso, la entrada es para cualquier persona autenticada.
  permission?: Permission;
  // Sección de oficina: sus datos solo están en el servidor, así que sin conexión avisa en vez
  // de fallar.
  needsConnection?: boolean;
};
