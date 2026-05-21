export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function buildCursorPage<T extends { id: string }>(items: T[], limit: number): CursorPage<T> {
  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, limit) : items;
  return {
    items: result,
    nextCursor: hasMore ? result[result.length - 1].id : null,
    hasMore,
  };
}
