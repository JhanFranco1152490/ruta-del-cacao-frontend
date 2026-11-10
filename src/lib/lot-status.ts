import {
  Ban,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  type LucideIcon,
  Medal,
  Package,
  Sun,
  Thermometer,
} from 'lucide-react';

import type { Tone } from '@/components/status-badge';
import type { components } from '@/lib/api/schema';

export type LotStatus = components['schemas']['LotStatusEnum'];

type LotStatusInfo = { label: string; tone: Tone; Icon: LucideIcon };

// La cadena del lote, en el orden en que avanza. Lotes, fermentación, secado, calidad y bodega la
// leen de aquí para que un estado se llame igual en todas las pantallas. Después de Evaluado se
// bifurca: Clasificado (y luego En bodega) o Descartado.
export const LOT_STATUSES: Record<LotStatus, LotStatusInfo> = {
  generated: { label: 'Generado', tone: 'info', Icon: Package },
  fermenting: { label: 'En fermentación', tone: 'warn', Icon: Thermometer },
  fermented: { label: 'Fermentado', tone: 'info', Icon: FlaskConical },
  drying: { label: 'En secado', tone: 'warn', Icon: Sun },
  dried: { label: 'Seco', tone: 'ok', Icon: CheckCircle2 },
  evaluated: { label: 'Evaluado', tone: 'info', Icon: ClipboardCheck },
  classified: { label: 'Clasificado', tone: 'ok', Icon: Medal },
  in_warehouse: { label: 'En bodega', tone: 'ok', Icon: Boxes },
  discarded: { label: 'Descartado', tone: 'err', Icon: Ban },
};

// Todos los estados, también Descartado: los que acepta un filtro.
export const LOT_STATUS_VALUES = Object.keys(LOT_STATUSES) as LotStatus[];

// La cadena principal, sin Descartado: es la salida de la bifurcación, no un paso más.
export const LOT_STATUS_ORDER = LOT_STATUS_VALUES.filter(
  (status) => status !== 'discarded',
);

// Un estado que llega como dato suelto (el `current_status` de un 409) antes de usarlo como estado.
export const isLotStatus = (value: unknown): value is LotStatus =>
  typeof value === 'string' && Object.hasOwn(LOT_STATUSES, value);

export const lotStatusLabel = (status: LotStatus) => LOT_STATUSES[status].label;
