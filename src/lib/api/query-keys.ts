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
    // Las de todas las fincas del alcance (de un productor, para la cuenta técnica), para el total.
    totals: (producer: string | null) =>
      ['input-stocks', 'totals', producer ?? ''] as const,
  },
  inputMovements: {
    all: () => ['input-movements'] as const,
    // Los movimientos de un insumo en una finca: solo se piden con conexión, sin copia local.
    list: (inputId: string, farmId: string) =>
      ['input-movements', inputId, farmId] as const,
  },
  agriculturalActivities: {
    // Lo que invalida programar, editar, eliminar o registrar una realización.
    all: () => ['agricultural-activities'] as const,
    // Las actividades programadas en un mes (yyyy-MM), con copia en el dispositivo. La cuenta
    // técnica elige el productor; las demás cuentas ven el suyo y pasan `null`.
    month: (producer: string | null, month: string) =>
      ['agricultural-activities', 'month', producer ?? '', month] as const,
    detail: (id: string) => ['agricultural-activities', 'detail', id] as const,
    // Las cuentas a las que se puede asignar una labor, con copia en el dispositivo.
    assignees: (producer: string | null) =>
      ['agricultural-activities', 'assignees', producer ?? ''] as const,
    // La realización de una actividad que sigue en la cola del dispositivo de esta persona.
    queued: (userId: string, id: string) =>
      ['agricultural-activities', 'queued', userId, id] as const,
  },
  characterizations: {
    // Las de todas las fincas: lo que invalida quien no conoce la finca (la cola solo sabe la
    // parcela).
    allFarms: () => ['characterizations', 'farm'] as const,
    // Las fichas de las parcelas de una finca: el detalle las pide todas juntas.
    byFarm: (farmId: string) => ['characterizations', 'farm', farmId] as const,
    // Las de una lista de parcelas (la página de una pantalla general), y todas esas listas.
    allPlotLists: () => ['characterizations', 'plots'] as const,
    byPlots: (plotIds: readonly string[]) =>
      ['characterizations', 'plots', plotIds] as const,
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
    // Las parcelas de todas las fincas, filtradas y paginadas: la pantalla general.
    lists: () => ['plots', 'list'] as const,
    list: (query: object) => ['plots', 'list', query] as const,
    // Una parcela que todavía está en la cola del dispositivo de esta persona.
    queued: (userId: string, id: string) =>
      ['plots', 'queued', userId, id] as const,
    // Una parcela leída sola, por su id.
    detail: (id: string) => ['plots', 'detail', id] as const,
  },
  farms: {
    all: () => ['farms'] as const,
    lists: () => ['farms', 'list'] as const,
    list: (query: object) => ['farms', 'list', query] as const,
    detail: (id: string) => ['farms', 'detail', id] as const,
    // Las fincas de un productor para elegir una en un filtro.
    options: (producer: string | undefined) =>
      ['farms', 'options', producer ?? ''] as const,
    // Las fincas que calzan con un buscador de finca.
    search: (query: object) => ['farms', 'search', query] as const,
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
