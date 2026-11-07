import { Ban, ClipboardCheck, Medal } from 'lucide-react';

import type { LotAction } from '@/lib/lot-actions';
import type { LotStatus } from '@/lib/lot-status';
import { QUALITY_PATH, qualityActionPath } from '@/lib/paths/quality';

import type { QualityPermissions } from './quality-actions';

const viewPath = (vista: string) =>
  `${QUALITY_PATH}?${new URLSearchParams({ vista })}`;

// El botón de la cabecera de Lotes cuando se mira un estado: Seco lleva a los lotes por evaluar y
// Evaluado, a los evaluados. Solo para quien puede evaluar, que es quien entra a Calidad.
export function qualityStageAction(
  status: LotStatus,
  can: QualityPermissions,
): LotAction | null {
  if (!can.evaluate) return null;
  if (status === 'dried') {
    return {
      id: 'go-to-quality',
      label: 'Ir a Calidad',
      href: viewPath('por-evaluar'),
      icon: ClipboardCheck,
    };
  }
  if (status === 'evaluated') {
    return {
      id: 'go-to-quality',
      label: 'Ir a Calidad',
      href: viewPath('evaluados'),
      icon: ClipboardCheck,
    };
  }
  return null;
}

// Lo que ofrece calidad en el menú de un lote de Lotes: evaluar el Seco, y clasificar o descartar
// el Evaluado. Cada opción abre su formulario en Calidad. Corregir la evaluación se hace desde
// Calidad o la ficha, donde se ve la evaluación que se corrige.
export function qualityLotActions(
  lot: { id: string; status: LotStatus },
  can: QualityPermissions,
): LotAction[] {
  if (!can.evaluate) return [];
  if (lot.status === 'dried') {
    return [
      {
        id: 'evaluate-lot',
        label: 'Evaluar',
        href: qualityActionPath(lot.id, 'evaluar'),
        icon: ClipboardCheck,
      },
    ];
  }
  if (lot.status !== 'evaluated') return [];
  return [
    can.classify && {
      id: 'classify-lot',
      label: 'Clasificar',
      href: qualityActionPath(lot.id, 'clasificar'),
      icon: Medal,
    },
    can.discard && {
      id: 'discard-lot',
      label: 'Descartar lote',
      href: qualityActionPath(lot.id, 'descartar'),
      icon: Ban,
    },
  ].filter((action): action is LotAction => action !== false);
}
