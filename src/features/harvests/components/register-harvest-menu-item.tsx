'use client';

import { Wheat } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { MenuItem } from '@/components/ui/menu';
import { useCurrentPath } from '@/hooks/use-current-path';
import { useSession } from '@/hooks/use-session';
import { withOrigin } from '@/lib/navigation/origin';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { harvestRegisterPath } from '../harvest-paths';

type PlotRef = {
  id: string;
  code: string;
  isActive: boolean;
  isSynced: boolean;
};
type FarmRef = { isActive: boolean };

// Registrar una cosecha desde el menú de una parcela, que llega ya elegida. Solo en una parcela
// activa de una finca activa que ya está en el servidor; si su ficha no tiene siembras, la
// pantalla lo dice. Funciona sin conexión: la cosecha se guarda en el teléfono.
export function RegisterHarvestMenuItem({
  farm,
  plot,
}: {
  farm: FarmRef;
  plot: PlotRef;
}) {
  const { data: user } = useSession();
  const router = useRouter();
  // Listo y Cancelar vuelven a la pantalla desde la que se abrió.
  const current = useCurrentPath();
  const allowed =
    hasPermission(user, PERMISSIONS.HARVESTS_ADD) &&
    farm.isActive &&
    plot.isActive &&
    plot.isSynced;
  if (!allowed) return null;
  return (
    <MenuItem
      aria-label={`Registrar cosecha en ${plot.code}`}
      onClick={() =>
        router.push(withOrigin(harvestRegisterPath(plot.id), current))
      }
    >
      <Wheat aria-hidden="true" className="size-4" />
      Registrar cosecha
    </MenuItem>
  );
}
