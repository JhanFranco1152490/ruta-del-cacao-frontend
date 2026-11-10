const formatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
  useGrouping: 'always',
});

// Los pesos colombianos van enteros y con punto de miles: «$ 4.567.500». Se arma a mano en vez de
// `style: 'currency'`, que según el motor pone un espacio que no parte o «COP» delante.
export const formatPesos = (pesos: number) =>
  `$ ${formatter.format(Math.round(pesos))}`;
