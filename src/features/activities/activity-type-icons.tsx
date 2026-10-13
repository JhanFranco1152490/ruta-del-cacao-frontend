import {
  Brush,
  ClipboardList,
  Droplets,
  Ellipsis,
  type LucideIcon,
  ScanSearch,
  Scissors,
  ShieldCheck,
  Shovel,
  Sprout,
} from 'lucide-react';

import type { ActivityType } from './activity-state';

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, LucideIcon> = {
  pruning: Scissors,
  fertilization: Sprout,
  irrigation: Droplets,
  weed_control: Shovel,
  phytosanitary_monitoring: ScanSearch,
  phytosanitary_control: ShieldCheck,
  cleaning_or_liming: Brush,
  inventory: ClipboardList,
  other: Ellipsis,
};

// Un ícono neutro por tipo de labor, para reconocerla de un vistazo en el calendario. El color es
// del estado, no del tipo: este ícono nunca lleva tono. Un tipo que esta versión no conoce usa el
// genérico.
export function ActivityTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = ACTIVITY_TYPE_ICONS[type as ActivityType] ?? Ellipsis;
  return <Icon aria-hidden="true" className={className} />;
}
