export const queryKeys = {
  accounts: {
    all: () => ['accounts'] as const,
    lists: () => ['accounts', 'list'] as const,
    list: (query: object) => ['accounts', 'list', query] as const,
    detail: (id: string) => ['accounts', 'detail', id] as const,
  },
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
  agriculturalInputs: {
    all: () => ['agricultural-inputs'] as const,
    // El catálogo completo de un productor (activos e inactivos), con copia en el dispositivo. La
    // cuenta técnica elige el productor; las demás cuentas ven el suyo y pasan `null`.
    list: (producer: string | null) =>
      ['agricultural-inputs', 'list', producer] as const,
  },
  inputStocks: {
    // Lo que invalida una entrada o un conteo, y la salida de una actividad que llega del
    // dispositivo: no siempre se sabe de qué finca era la copia abierta.
    all: () => ['input-stocks'] as const,
    // Las existencias de una finca, con copia en el dispositivo.
    byFarm: (farmId: string) => ['input-stocks', 'farm', farmId] as const,
  },
  inputMovements: {
    all: () => ['input-movements'] as const,
    // Los movimientos de un insumo en una finca: solo se piden con conexión, sin copia local.
    list: (inputId: string, farmId: string) =>
      ['input-movements', inputId, farmId] as const,
  },
  characterizations: {
    // Las de todas las fincas: lo que invalida quien no conoce la finca (la cola solo sabe la
    // parcela).
    allFarms: () => ['characterizations', 'farm'] as const,
    // Las fichas de las parcelas de una finca: el detalle las pide todas juntas.
    byFarm: (farmId: string) => ['characterizations', 'farm', farmId] as const,
    // La ficha de una parcela que sigue en la cola del dispositivo de esta persona.
    queued: (userId: string, plotId: string) =>
      ['characterizations', 'queued', userId, plotId] as const,
    // Las versiones de la ficha de una parcela: solo se piden con conexión, sin copia local.
    history: (plotId: string) =>
      ['characterizations', 'history', plotId] as const,
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
    // Todas las fincas de un productor para elegir una, con copia en el dispositivo. La cuenta
    // técnica elige el productor; las demás cuentas leen las suyas y pasan `null`.
    options: (producer: string | null) =>
      ['farms', 'options', producer] as const,
    mapCounts: (query: object) => ['farms', 'map', 'counts', query] as const,
    mapPoints: (municipality: string, query: object) =>
      ['farms', 'map', 'points', municipality, query] as const,
    // Una finca que todavía está en la cola del dispositivo de esta persona.
    queued: (userId: string, id: string) =>
      ['farms', 'queued', userId, id] as const,
  },
};
