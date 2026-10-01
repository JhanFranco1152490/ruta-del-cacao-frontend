// La operación cubre solo Norte de Santander: el departamento se muestra fijo y no se elige.
export const OPERATING_DEPARTMENT = {
  code: '54',
  name: 'Norte de Santander',
} as const;

// En DIVIPOLA los dos primeros dígitos del código municipal son el código del departamento.
// Derivarlo del municipio evita que ambos lleguen a la API sin corresponderse.
export const departmentCodeOf = (municipalityCode: string) =>
  municipalityCode.slice(0, 2);

// Vista inicial de los mapas cuando todavía no hay un punto que mostrar: el departamento
// completo.
export const OPERATING_AREA_VIEW = {
  center: { latitude: 8.05, longitude: -72.85 },
  zoom: 8,
} as const;
