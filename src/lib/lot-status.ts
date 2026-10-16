import {
  CheckCircle2,
  FlaskConical,
  type LucideIcon,
  Package,
  Sun,
  Thermometer,
} from 'lucide-react';

import type { Tone } from '@/components/status-badge';
import type { components } from '@/lib/api/schema';

export type LotStatus = components['schemas']['LotStatusEnum'];

type LotStatusInfo = { label: string; tone: Tone; Icon: LucideIcon };

// La cadena del lote, en el orden en que avanza. Lotes, fermentación y secado la leen de aquí para
// que un estado se llame igual en todas las pantallas.
export const LOT_STATUSES: Record<LotStatus, LotStatusInfo> = {
  generated: { label: 'Generado', tone: 'info', Icon: Package },
  fermenting: { label: 'En fermentación', tone: 'warn', Icon: Thermometer },
  fermented: { label: 'Fermentado', tone: 'info', Icon: FlaskConical },
  drying: { label: 'En secado', tone: 'warn', Icon: Sun },
  dried: { label: 'Seco', tone: 'ok', Icon: CheckCircle2 },
};

export const LOT_STATUS_ORDER = Object.keys(LOT_STATUSES) as LotStatus[];

export const lotStatusLabel = (status: LotStatus) => LOT_STATUSES[status].label;
