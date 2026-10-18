'use client';

import { cn } from 'cn';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { EditorLink } from '@/components/editor-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { Harvest } from '../api';
import {
  type HarvestLotSource,
  lotSourceOfHarvest,
} from '../harvest-lot-source';
import { harvestCorrectionPath } from '../harvest-paths';
import { HarvestDeleteDialog } from './harvest-delete-dialog';

// Lo que se hace con una cosecha que todavía no forma un lote, según los permisos. Corregir y
// eliminar necesitan conexión; Eliminar va al final, lejos de Volver.
export function HarvestDetailActions({
  harvest,
  renderFormLot,
}: {
  harvest: Harvest;
  renderFormLot?: (source: HarvestLotSource) => ReactNode;
}) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const canCorrect = hasPermission(user, PERMISSIONS.HARVESTS_CHANGE);
  const canDelete = hasPermission(user, PERMISSIONS.HARVESTS_DELETE);

  return (
    <>
      {renderFormLot?.(lotSourceOfHarvest(harvest))}
      {canCorrect &&
        (hasConnection ? (
          <EditorLink
            className={cn(
              buttonVariants({ size: 'office', variant: 'outline' }),
              'h-11',
            )}
            href={harvestCorrectionPath(harvest.id)}
          >
            <Pencil aria-hidden="true" className="size-4" /> Corregir cosecha
          </EditorLink>
        ) : (
          <Button className="h-11" disabled size="office" variant="outline">
            Corregir (necesita conexión)
          </Button>
        ))}
      {canDelete &&
        (hasConnection ? (
          <HarvestDeleteDialog harvest={harvest} />
        ) : (
          <Button className="h-11" disabled size="office" variant="outline">
            Eliminar (necesita conexión)
          </Button>
        ))}
    </>
  );
}
