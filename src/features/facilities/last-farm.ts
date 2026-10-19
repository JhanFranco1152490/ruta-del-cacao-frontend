import { readPreference, rememberPreference } from '@/lib/device-preference';

// La última finca cuyos cajones y marquesinas consultó la persona en este dispositivo: al volver,
// la lista entra directo a ella en vez de preguntar.
const keyOf = (userId: string) => `facilities:last-farm:${userId}`;

export const readLastFarm = (userId: string) => readPreference(keyOf(userId));

export const rememberLastFarm = (userId: string, farmId: string) =>
  rememberPreference(keyOf(userId), farmId);
