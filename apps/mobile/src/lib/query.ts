import type { Page } from '@dari/contracts';
import { QueryClient, useInfiniteQuery, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api, ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
});

type Query = Record<string, string | number | boolean | undefined | null>;

/** `GET path?query` as a cached, typed React Query. */
export function useApi<T>(path: string | null, query?: Query, options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>) {
  return useQuery<T>({
    queryKey: [path, query],
    queryFn: () => api.get<T>(path!, query),
    enabled: path !== null && (options?.enabled ?? true),
    ...options,
  });
}

/** Keyset-paginated `GET path` (`Page<T>`), flattened, with `loadMore`. */
export function usePaged<T>(path: string | null, query: Query = {}, pageSize = 20) {
  const q = useInfiniteQuery({
    queryKey: [path, 'paged', query],
    queryFn: ({ pageParam }) => api.get<Page<T>>(path!, { ...query, cursor: pageParam, limit: pageSize }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: path !== null,
  });
  return { ...q, items: q.data?.pages.flatMap((p) => p.items) ?? [] };
}
