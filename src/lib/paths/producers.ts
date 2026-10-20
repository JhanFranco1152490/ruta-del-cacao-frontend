export const PRODUCERS_PATH = '/productores';

// La ficha de un productor.
export const producerPath = (producerId: string) =>
  `${PRODUCERS_PATH}/${encodeURIComponent(producerId)}`;
