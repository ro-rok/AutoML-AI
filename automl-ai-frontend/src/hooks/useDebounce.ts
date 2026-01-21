// src/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

/**
 * Debounces a value by delaying updates until after the specified delay
 * 
 * Example usage:
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // This will only run 300ms after the user stops typing
 *   if (debouncedSearchTerm) {
 *     fetchSearchResults(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Creates a debounced callback function
 * 
 * Example usage:
 * ```tsx
 * const handleSearch = useDebouncedCallback((term: string) => {
 *   fetchSearchResults(term);
 * }, 300);
 * 
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 * 
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args: Parameters<T>) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}
