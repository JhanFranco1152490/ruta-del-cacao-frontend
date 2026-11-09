import { Ban, CheckCircle2, type LucideIcon } from 'lucide-react';

import type { Tone } from '@/components/status-badge';

import type { SaleStatus } from './api';

type SaleStatusInfo = { label: string; tone: Tone; Icon: LucideIcon };

// Cada estado con su ícono y su texto: nunca solo el color.
export const SALE_STATUSES: Record<SaleStatus, SaleStatusInfo> = {
  registered: { label: 'Registrada', tone: 'ok', Icon: CheckCircle2 },
  voided: { label: 'Anulada', tone: 'warn', Icon: Ban },
};

export const saleStatusLabel = (status: SaleStatus) =>
  SALE_STATUSES[status].label;
