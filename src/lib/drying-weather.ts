import type { components } from '@/lib/api/schema';

export type Weather = components['schemas']['DryingWeatherEnum'];

// El clima de un día de secado, como se elige en la bitácora y se lee en la historia del lote.
export const WEATHER_LABELS: Record<Weather, string> = {
  sunny: 'Soleado',
  partly_cloudy: 'Parcialmente nublado',
  cloudy: 'Nublado',
  rainy: 'Lluvioso',
};
