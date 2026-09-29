export const queryKeys = {
  session: () => ['session'] as const,
  municipalities: () => ['municipalities'] as const,
  producers: {
    all: () => ['producers'] as const,
    lists: () => ['producers', 'list'] as const,
    list: (query: object) => ['producers', 'list', query] as const,
    detail: (id: string) => ['producers', 'detail', id] as const,
  },
  farms: {
    // Una finca que todavía está en la cola del dispositivo de esta persona.
    queued: (userId: string, id: string) =>
      ['farms', 'queued', userId, id] as const,
  },
};
