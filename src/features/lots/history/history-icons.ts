import {
  ArrowLeftRight,
  Ban,
  Boxes,
  ClipboardCheck,
  type LucideIcon,
  Medal,
  PackageMinus,
  PackagePlus,
  Receipt,
  Sun,
  Thermometer,
  Wheat,
} from 'lucide-react';

import type { LotHistoryKind } from '../api';

// Un ícono por etapa: la línea de tiempo se recorre de un vistazo por ellos, además del título.
export const HISTORY_ICONS: Record<LotHistoryKind, LucideIcon> = {
  harvest: Wheat,
  lot_created: PackagePlus,
  fermentation: Thermometer,
  drying: Sun,
  evaluation: ClipboardCheck,
  classification: Medal,
  discard: Ban,
  stock_entry: Boxes,
  stock_move: ArrowLeftRight,
  stock_exit: PackageMinus,
  sale: Receipt,
};
