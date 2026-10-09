import type { LucideIcon } from 'lucide-react';

import type { Permission } from '@/lib/permissions';

// Un destino de segundo nivel bajo una sección: una tarea que se hace seguido y que está más
// adentro de lo que alcanza el menú principal (registrar una parcela, por ejemplo).
export type NavChild = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
};

export type NavItem = {
  href: string;
  label: string;
  // El nombre para quien tiene un productor propio, que ve solo lo suyo ("Mis fincas"). Sin él,
  // todos ven `label`.
  ownLabel?: string;
  icon: LucideIcon;
  // Rutas de la sección que no empiezan por `href`: las pantallas de una tarea que viven bajo
  // otra sección (registrar una parcela vive bajo /fincas, por ejemplo).
  routes?: readonly string[];
  // Sin permiso, la entrada es para cualquier persona autenticada.
  permission?: Permission;
  // Sección de oficina: sus datos solo están en el servidor, así que sin conexión avisa en vez
  // de fallar.
  needsConnection?: boolean;
  children?: readonly NavChild[];
};
