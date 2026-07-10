// hooks/useDebounce.ts
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * A hook that debounces a value with a specified delay
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     // Search API call here
 *   }
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes before the delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A hook that debounces a callback function
 * 
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced function
 * 
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   // Search API call here
 * }, 500);
 * 
 * // Use in input onChange
 * <Input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      // Clear the existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set a new timeout to execute the callback after the delay
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * A hook that debounces a promise-returning function (useful for API calls)
 * 
 * @param callback - The async function to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced function with loading state
 * 
 * @example
 * ```tsx
 * const { execute, isLoading } = useDebouncedAsync(searchProducts, 500);
 * 
 * // Use in input onChange
 * <Input onChange={(e) => execute(e.target.value)} />
 * ```
 */
export function useDebouncedAsync<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number = 500
): {
  execute: (...args: Parameters<T>) => Promise<ReturnType<T> | undefined>;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const executingRef = useRef<boolean>(false);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      // Clear the existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // If already executing, return
      if (executingRef.current) {
        return undefined;
      }

      return new Promise((resolve, reject) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            executingRef.current = true;
            setIsLoading(true);
            const result = await callback(...args);
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          } finally {
            executingRef.current = false;
            setIsLoading(false);
          }
        }, delay);
      });
    },
    [callback, delay]
  );

  return { execute, isLoading };
}

export default useDebounce;