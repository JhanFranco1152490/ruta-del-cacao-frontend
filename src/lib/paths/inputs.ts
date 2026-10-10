export const INPUTS_PATH = '/insumos';

// La lista de insumos con las existencias de una finca. La cuenta técnica también necesita el
// productor: sus fincas se eligen dentro de uno.
export const inputListPath = (farmId: string, producerId?: string | null) => {
  const params = new URLSearchParams({ finca: farmId });
  if (producerId) params.set('productor', producerId);
  return `${INPUTS_PATH}?${params}`;
};
