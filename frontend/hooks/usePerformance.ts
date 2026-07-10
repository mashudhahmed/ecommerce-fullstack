// hooks/usePerformance.ts
import { useEffect, useRef, useState } from 'react';

export function usePerformance<T>(name: string, deps: any[] = []) {
  const [value, setValue] = useState<T | null>(null);
  const mountedRef = useRef(false);
  const perfRef = useRef<{ start: number; end: () => void } | null>(null);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      }
    };
  }, deps);

  return {
    value,
    setValue: (newValue: T) => {
      if (perfRef.current) {
        perfRef.current.end();
      }
      
      const startTime = performance.now();
      perfRef.current = {
        start: startTime,
        end: () => {
          const duration = performance.now() - startTime;
          if (process.env.NODE_ENV === 'development') {
            console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
          }
        },
      };
      
      setValue(newValue);
    },
  };
}