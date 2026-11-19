import type { ReactNode } from 'react';
import { Button, Empty, Loading } from './ui';

/** Loading → empty → items → "more" button, for any `usePaged` result. */
export function PagedItems<T>({ list, empty, render }: { list: { items: T[]; isLoading: boolean; hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown }; empty: string; render: (item: T) => ReactNode }) {
  if (list.isLoading) return <Loading />;
  if (!list.items.length) return <Empty title={empty} />;
  return (
    <>
      {list.items.map(render)}
      {list.hasNextPage && <Button title="المزيد" variant="secondary" loading={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} />}
    </>
  );
}
