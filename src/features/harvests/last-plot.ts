import { readPreference, rememberPreference } from '@/lib/device-preference';

// La última parcela en la que la persona registró una cosecha en este dispositivo: el formulario
// la propone al abrirse, porque en campo se vuelve a la misma.
const keyOf = (userId: string) => `harvests:last-plot:${userId}`;

export const readLastPlot = (userId: string) => readPreference(keyOf(userId));

export const rememberLastPlot = (userId: string, plotId: string) =>
  rememberPreference(keyOf(userId), plotId);
