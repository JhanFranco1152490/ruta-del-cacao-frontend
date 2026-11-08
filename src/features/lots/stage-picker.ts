'use client';

import { useState } from 'react';

import type {
  SectionPick,
  SectionPickControl,
  SectionStage,
} from '@/components/page-blocks/section-item';
import type { LotStatus } from '@/lib/lot-status';

export type LotStageId = 'fermentation' | 'drying' | 'quality';

const STAGE_ORDER: LotStageId[] = ['fermentation', 'drying', 'quality'];

// La etapa que se trabaja según el estado del lote: la que se muestra al llegar a su ficha. Un lote
// Fermentado ya espera su secado, y uno Seco en adelante se mira por su calidad: lo que falta es
// evaluarlo, y el secado ya quedó en su resumen.
export function currentStage(status: LotStatus): LotStageId {
  if (status === 'generated' || status === 'fermenting') return 'fermentation';
  if (status === 'fermented' || status === 'drying') return 'drying';
  return 'quality';
}

// Dónde va una etapa respecto de la del lote.
export function stageOf(id: LotStageId, status: LotStatus): SectionStage {
  const current = STAGE_ORDER.indexOf(currentStage(status));
  const index = STAGE_ORDER.indexOf(id);
  if (index < current) return 'done';
  return index === current ? 'current' : 'pending';
}

export type StagePicker = { of: (id: LotStageId) => SectionPickControl };

// Qué etapa del lote se muestra: siempre una. Empieza en la del estado del lote y, si el lote cambia
// de estado (se inició o finalizó una etapa), pasa a la nueva. Devuelve el mismo control para los
// renglones de la lista y para el panel, que comparten la elegida.
export function useStagePicker(status: LotStatus): {
  items: StagePicker;
  panels: StagePicker;
} {
  const [state, setState] = useState<{ status: LotStatus; id: LotStageId }>({
    status,
    id: currentStage(status),
  });
  let selected = state.id;
  if (state.status !== status) {
    selected = currentStage(status);
    setState({ status, id: selected });
  }
  const picker = (as: SectionPick['as']): StagePicker => ({
    of: (id) => ({
      as,
      selected: selected === id,
      onSelect: () => setState({ status, id }),
      stage: stageOf(id, status),
    }),
  });
  return { items: picker('item'), panels: picker('panel') };
}
