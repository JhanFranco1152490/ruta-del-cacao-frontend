import { isDecimal } from '@/lib/validation/decimal';

// Kilos y porcentajes se suman en décimas enteras: 0,1 + 0,2 en coma flotante no da 0,3, y una
// diferencia de 0,0000001 kg no puede bloquear un guardado.
export function toTenths(text: string): number | null {
  const value = text.trim().replace(',', '.');
  if (!isDecimal(value)) return null;
  return Math.round(Number(value) * 10);
}

export const fromTenths = (tenths: number) => tenths / 10;

// Suma lo que se escribió en varios campos. Uno vacío, mal escrito o negativo cuenta como cero: su
// propio error ya lo dice.
export const sumTenths = (texts: readonly string[]) =>
  texts.reduce((sum, text) => sum + Math.max(toTenths(text) ?? 0, 0), 0);
