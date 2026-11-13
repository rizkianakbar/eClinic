/** Every TanStack Query key in the app comes from here. */
export const queryKeys = {
  patients: {
    all: ['patients'] as const,
    search: (query: string) => ['patients', 'search', query] as const,
  },
  medicines: {
    search: (query: string) => ['medicines', 'search', query] as const,
  },
  icd10: {
    search: (query: string) => ['icd10', 'search', query] as const,
  },
  queue: {
    all: ['queue'] as const,
    board: (visitDate: string) => ['queue', 'board', visitDate] as const,
    desk: (visitDate: string, visitIds: readonly string[]) => ['queue', 'desk', visitDate, ...visitIds] as const,
  },
};
