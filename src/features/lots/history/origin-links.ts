import type { LotHistory } from '../api';

// Los enlaces del origen del lote a pantallas de otros dominios. Los arma quien monta la pantalla,
// cada uno solo si la cuenta puede abrir esa pantalla.
export type OriginLinks = {
  harvest?: string;
  plotHealth?: string;
  plotActivities?: string;
};

// Los kilos en baba son los de la cosecha, que es siempre una etapa de la historia.
export function harvestGreenKg({ stages }: LotHistory) {
  for (const stage of stages) {
    if (stage.kind === 'harvest') return stage.harvest.green_weight_kg;
  }
  return null;
}
