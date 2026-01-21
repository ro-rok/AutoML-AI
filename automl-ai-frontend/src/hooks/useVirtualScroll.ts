// src/hooks/useVirtualScroll.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside visible area
}

interface VirtualScrollResult {
  virtualItems: Array<{
    index: number;
    start: number;
    size: number;
  }>;
  totalHeight: number;
  scrollRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for implementing virtual scrolling to efficiently render large lists
 * Only renders items that are visible in the viewport plus a small overscan buffer
 * 
 * @param options - Configuration for virtual scrolling
 * @returns Virtual scroll state and ref
 */
export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3,
}: UseVirtualScrollOptions): VirtualScrollResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate total height of all items
  const totalHeight = itemCount * itemHeight;

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Generate virtual items for visible range
  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      start: i * itemHeight,
      size: itemHeight,
    });
  }

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return {
    virtualItems,
    totalHeight,
    scrollRef,
  };
}
