import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

export type Drying = Schemas['DryingProcess'];
export type DryingLog = Schemas['DryingLog'];
export type DryingResult = Schemas['DryingResult'];
export type StartOptions = Schemas['DryingStartOptions'];
export type Weather = Schemas['DryingWeatherEnum'];
