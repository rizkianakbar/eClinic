/** Every TanStack Query key in the app comes from here. */
export const queryKeys = {
  patients: {
    all: ["patients"] as const,
    search: (query: string) => ["patients", "search", query] as const,
  },
};
