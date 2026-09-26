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
}: {
  tone: Tone;
  children: ReactNode;
}) {
  const Icon = ICONS[tone];
  return (
    <Badge variant={tone}>
      <Icon aria-hidden="true" className="size-4" />
      {children}
    </Badge>
  );
}
