import React from "react";

// lib/performance.ts
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export function measurePerformance(name: string) {
  if (typeof window === 'undefined') return { end: () => {} };

  const startTime = performance.now();
  let ended = false;

  return {
    end: (metadata?: Record<string, any>) => {
      if (ended) return;
      ended = true;
      
      const duration = performance.now() - startTime;
      const metric: PerformanceMetric = {
        name,
        duration,
        timestamp: Date.now(),
        metadata,
      };

      // ✅ Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`, metadata || '');
      }

      // ✅ Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        // sendToAnalytics(metric);
      }

      return metric;
    },
  };
}

// ✅ Component performance HOC
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const perf = React.useMemo(() => measurePerformance(`${componentName}-render`), []);
    
    React.useEffect(() => {
      return () => {
        perf.end({ component: componentName });
      };
    }, [perf]);

    return React.createElement(WrappedComponent, props);
  };
}

// ✅ Image performance tracking
export function trackImageLoad(imageUrl: string) {
  if (typeof window === 'undefined') return;

  const img = new Image();
  const startTime = performance.now();

  img.onload = () => {
    const duration = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`🖼️ Image loaded: ${imageUrl} (${duration.toFixed(2)}ms)`);
    }
  };

  img.onerror = () => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ Image failed to load: ${imageUrl}`);
    }
  };

  img.src = imageUrl;
}

// ✅ Use in components
// const perf = measurePerformance('ProductList');
// ... render ...
// perf.end({ itemCount: products.length });