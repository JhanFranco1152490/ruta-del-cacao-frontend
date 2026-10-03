// Rutas viejas que siguen funcionando: enlaces guardados o compartidos no deben romperse.
export const LEGACY_REDIRECTS = [
  // La entrada de la app era /panel antes de quitar esa pantalla.
  { source: '/panel', destination: '/', permanent: false },
  { source: '/producers', destination: '/productores', permanent: false },
  {
    source: '/producers/new',
    destination: '/productores/nuevo',
    permanent: false,
  },
  {
    source: '/producers/:id',
    destination: '/productores/:id',
    permanent: false,
  },
  {
    source: '/producers/:id/edit',
    destination: '/productores/:id/editar',
    permanent: false,
  },
  // La edición pasó a una ruta fija para abrir sin conexión cualquier finca. `parcelas` queda
  // fuera: `/fincas/parcelas/editar` es la pantalla de editar parcelas, no la de una finca con
  // ese id.
  {
    source: '/fincas/:id((?!parcelas/)[^/]+)/editar',
    destination: '/fincas/editar?id=:id',
    permanent: false,
  },
];
