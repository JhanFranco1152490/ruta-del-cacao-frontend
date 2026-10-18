'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { plotHistoryPath } from '../health-paths';

// El acceso al historial fitosanitario desde la tarjeta de una parcela. Lo ve quien consulta
// actividades, y solo en una parcela que ya está en el servidor: una que espera en el dispositivo
// todavía no tiene monitoreos.
export function PlotHistoryLink({
  plot,
}: {
  plot: { id: string; code: string; inServer: boolean };
}) {
  const { data: user } = useSession();
  if (!plot.inServer || !hasPermission(user, PERMISSIONS.ACTIVITIES_VIEW)) {
    return null;
  }
  return (
    <Link
      aria-label={`Historial fitosanitario de ${plot.code}`}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-selva underline underline-offset-4"
      href={plotHistoryPath(plot.id)}
    >
      <ShieldCheck aria-hidden="true" className="size-4" />
      Historial fitosanitario
    </Link>
  );
}
