export const queryKeys = {
  accounts: {
    all: () => ['accounts'] as const,
    lists: () => ['accounts', 'list'] as const,
    list: (query: object) => ['accounts', 'list', query] as const,
    detail: (id: string) => ['accounts', 'detail', id] as const,
  },
  associationAccess: () => ['association-access'] as const,
  permissions: () => ['permissions'] as const,
  roles: {
    all: () => ['roles'] as const,
    lists: () => ['roles', 'list'] as const,
    options: () => ['roles', 'list', 'options'] as const,
    list: (query: object) => ['roles', 'list', query] as const,
    detail: (id: string) => ['roles', 'detail', id] as const,
  },
  session: () => ['session'] as const,
  // Aparte de la sesión: la sesión se guarda en el dispositivo y el perfil no.
  profile: () => ['profile'] as const,
  municipalities: () => ['municipalities'] as const,
  producers: {
    all: () => ['producers'] as const,
    lists: () => ['producers', 'list'] as const,
    list: (query: object) => ['producers', 'list', query] as const,
    detail: (id: string) => ['producers', 'detail', id] as const,
    dependents: (id: string) => ['producers', 'dependents', id] as const,
  },
  cacaoVarieties: {
    all: () => ['cacao-varieties'] as const,
    // El catálogo completo de la pantalla de variedades (activas e inactivas).
    list: () => ['cacao-varieties', 'list'] as const,
    // Las activas, que ofrece la ficha de una parcela; con copia en el dispositivo.
    active: () => ['cacao-varieties', 'active'] as const,
  },
  plots: {
    // Las parcelas de una finca: el detalle de finca siempre las pide por finca.
    byFarm: (farmId: string) => ['plots', 'farm', farmId] as const,
    // Una parcela que todavía está en la cola del dispositivo de esta persona.
    queued: (userId: string, id: string) =>
      ['plots', 'queued', userId, id] as const,
  },
  farms: {
    all: () => ['farms'] as const,
    lists: () => ['farms', 'list'] as const,
    list: (query: object) => ['farms', 'list', query] as const,
    detail: (id: string) => ['farms', 'detail', id] as const,
    // La finca tal como la muestra su pantalla de detalle, con la fecha de la copia si vino del
    // dispositivo. Cuelga de `detail`, así que lo que invalida una finca invalida también esta.
    detailView: (id: string) => ['farms', 'detail', id, 'view'] as const,
    mapCounts: (query: object) => ['farms', 'map', 'counts', query] as const,
    mapPoints: (municipality: string, query: object) =>
      ['farms', 'map', 'points', municipality, query] as const,
    // Una finca que todavía está en la cola del dispositivo de esta persona.
    queued: (userId: string, id: string) =>
      ['farms', 'queued', userId, id] as const,
  },
};
