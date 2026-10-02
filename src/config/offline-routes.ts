// Pantallas fijas que el Service Worker guarda al instalarse: abren sin conexión aunque nunca se
// hayan visitado. Las rutas con parámetros en la ruta no van aquí: no hay una sola página que
// guardar (por eso las de captura usan el id como parámetro de la URL). El inicio de sesión y la
// recuperación de contraseña tampoco: sin red no sirven, y el inicio de sesión se regenera en el
// servidor cada día, así que guardado quedaría fijo hasta el siguiente despliegue.
export const OFFLINE_PRECACHE_ROUTES = [
  '/panel',
  '/fincas',
  '/fincas/nueva',
  '/fincas/editar',
  '/productores',
  '/productores/nuevo',
  '/usuarios',
  '/roles',
  '/mi-productor',
  '/sin-conexion',
] as const;

// Lo que ve quien abre sin conexión una página que no está guardada.
export const OFFLINE_FALLBACK_ROUTE = '/sin-conexion';
