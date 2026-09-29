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
  municipalities: () => ['municipalities'] as const,
  producers: {
    all: () => ['producers'] as const,
    lists: () => ['producers', 'list'] as const,
    list: (query: object) => ['producers', 'list', query] as const,
    detail: (id: string) => ['producers', 'detail', id] as const,
  },
};
