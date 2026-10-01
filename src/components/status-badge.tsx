import {
  CheckCircle2,
  CircleX,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';

type Tone = 'ok' | 'warn' | 'err' | 'info';

const SOLID_VARIANTS = {
  ok: 'ok-solid',
  warn: 'warn-solid',
  err: 'err-solid',
  info: 'info-solid',
} as const;

const ICONS: Record<Tone, LucideIcon> = {
  ok: CheckCircle2,
  warn: TriangleAlert,
  err: CircleX,
  info: Info,
};

// Nunca color solo: el estado siempre lleva ícono y texto.
export function StatusBadge({
  tone,
  children,
  solid = false,
}: {
  tone: Tone;
  children: ReactNode;
  solid?: boolean;
}) {
  const Icon = ICONS[tone];
  return (
    <Badge variant={solid ? SOLID_VARIANTS[tone] : tone}>
      <Icon aria-hidden="true" className="size-4" />
      {children}
    </Badge>
  );
}
