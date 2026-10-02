// Rutas viejas que siguen funcionando: enlaces guardados o compartidos no deben romperse.
export const LEGACY_REDIRECTS = [
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
  // La edición pasó a una ruta fija para abrir sin conexión cualquier finca.
  {
    source: '/fincas/:id/editar',
    destination: '/fincas/editar?id=:id',
    permanent: false,
  },
];
