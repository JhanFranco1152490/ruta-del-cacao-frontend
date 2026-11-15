import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

export type ProducerIndicators = Schemas['ProducerIndicators'];
export type AssociationIndicators = Schemas['AssociationIndicators'];
export type PlotProduction = Schemas['PlotProduction'];
export type AssociationFarm = Schemas['AssociationFarm'];
export type FarmStock = Schemas['FarmStock'];
export type ProducerQuality = Schemas['ProducerQuality'];
// El reparto de calidad que traen los dos paneles: el del productor suma además los lotes.
export type QualitySplit = Omit<
  ProducerQuality,
  'lots_classified' | 'lots_discarded'
>;
