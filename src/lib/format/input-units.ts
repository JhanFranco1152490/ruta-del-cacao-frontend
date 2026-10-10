import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];
type Option<T extends string> = { value: T; label: string };

// Lo que hace falta para escribir la cantidad de un insumo. Vive aquí y no en el dominio de
// insumos porque también la escriben otros dominios (lo que gastó una labor).
export type InputUnit = Schemas['UnitEnum'];

// Cómo se escribe la unidad junto a una cantidad: "250 mL", "1 unidad", "12 unidades".
export const UNIT_SYMBOLS: Record<
  InputUnit,
  { singular: string; plural: string }
> = {
  kg: { singular: 'kg', plural: 'kg' },
  g: { singular: 'g', plural: 'g' },
  l: { singular: 'L', plural: 'L' },
  ml: { singular: 'mL', plural: 'mL' },
  unit: { singular: 'unidad', plural: 'unidades' },
};

// El empaque en que se compra el insumo. La lista es fija para saber escribir el plural.
export const PACKAGE_TYPE_OPTIONS = [
  { value: 'sack', label: 'Bulto', plural: 'bultos' },
  { value: 'bag', label: 'Bolsa', plural: 'bolsas' },
  { value: 'tub', label: 'Pote', plural: 'potes' },
  { value: 'flask', label: 'Frasco', plural: 'frascos' },
  { value: 'bottle', label: 'Botella', plural: 'botellas' },
  { value: 'gallon', label: 'Galón', plural: 'galones' },
  { value: 'drum', label: 'Caneca', plural: 'canecas' },
  { value: 'box', label: 'Caja', plural: 'cajas' },
  { value: 'sachet', label: 'Sobre', plural: 'sobres' },
] as const satisfies readonly (Option<Schemas['PackageTypeEnum']> & {
  plural: string;
})[];
