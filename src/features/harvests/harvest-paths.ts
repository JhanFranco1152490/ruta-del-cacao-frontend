export const HARVESTS_PATH = '/cosechas';

// La pantalla de campo donde se registra una cosecha. Ruta fija con parámetros: una sola página
// guardada sirve para registrar, corregir y abrir desde una parcela, también sin conexión.
export const HARVEST_REGISTER_PATH = `${HARVESTS_PATH}/registrar`;

// Registrar, con la parcela ya elegida si se abre desde ella.
export const harvestRegisterPath = (plotId?: string) =>
  plotId
    ? `${HARVEST_REGISTER_PATH}?${new URLSearchParams({ parcela: plotId })}`
    : HARVEST_REGISTER_PATH;

// Corregir una cosecha del servidor que todavía no forma un lote.
export const harvestCorrectionPath = (harvestId: string) =>
  `${HARVEST_REGISTER_PATH}?${new URLSearchParams({ id: harvestId })}`;

// Corregir una cosecha que el servidor rechazó y sigue en la cola del dispositivo.
export const queuedHarvestCorrectionPath = (harvestId: string) =>
  `${HARVEST_REGISTER_PATH}?${new URLSearchParams({ pendiente: harvestId })}`;

export const harvestDetailPath = (harvestId: string) =>
  `${HARVESTS_PATH}/detalle?${new URLSearchParams({ id: harvestId })}`;
