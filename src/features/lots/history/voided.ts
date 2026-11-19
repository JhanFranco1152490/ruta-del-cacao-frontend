import { dateInBogota, formatLongDate } from '@/lib/format/dates';

type Voidable = {
  voided_at: string | null;
  void_reason: string | null;
  voided_by?: string | null;
};

// Una venta o una salida anuladas siguen en la historia: el lote sí pasó por ahí. Dicen cuándo, por
// qué y, si se sabe, quién: «Anulada el 22 de abril de 2026 por Ana Ruiz: Error al digitar». La
// venta no guarda quién la anuló.
export function voidedText({ voided_at, void_reason, voided_by }: Voidable) {
  if (!voided_at) return null;
  const by = voided_by ? ` por ${voided_by}` : '';
  const reason = void_reason?.trim() ? `: ${void_reason.trim()}` : '';
  return `Anulada el ${formatLongDate(dateInBogota(voided_at))}${by}${reason}`;
}
