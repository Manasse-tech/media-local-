'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

interface UseVirtualListOptions {
  itemsCount: number;
  itemHeight: number;
  overscan?: number;
}

export function useVirtualList({
  itemsCount,
  itemHeight,
  overscan = 5,
}: UseVirtualListOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = itemsCount * itemHeight;

  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    const rawStart = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    const startIndex = Math.max(0, rawStart - overscan);
    const endIndex = Math.min(itemsCount - 1, rawStart + visibleCount + overscan);

    const virtualItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        offsetTop: i * itemHeight,
      });
    }

    return { startIndex, endIndex, virtualItems };
  }, [scrollTop, containerHeight, itemHeight, itemsCount, overscan]);

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    onScroll,
    setContainerHeight,
  };
}
