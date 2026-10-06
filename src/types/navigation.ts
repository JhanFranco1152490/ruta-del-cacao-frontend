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
  // La cuenta técnica elige aquí el productor con el que trabaja (el contexto de la lista y el de
  // sus formularios). Solo donde no hay un recurso que ya diga de quién es: fincas, parcelas y
  // fichas lo dicen por sí mismas.
  actsUnderProducer?: boolean;
};
