import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

// Route prefetching configuration
const PREFETCH_ROUTES = [
  '/dashboard',
  '/chat',
  '/voice',
  '/vocabulary',
  '/goals',
  '/progress',
  '/settings'
];

// Cache for route data
const routeCache = new Map<string, any>();

// Performance monitoring
interface RouteMetrics {
  route: string;
  loadTime: number;
  timestamp: number;
}

const routeMetrics: RouteMetrics[] = [];

export class RouteOptimizer {
  private static instance: RouteOptimizer;
  private prefetchedRoutes = new Set<string>();
  
  static getInstance(): RouteOptimizer {
    if (!RouteOptimizer.instance) {
      RouteOptimizer.instance = new RouteOptimizer();
    }
    return RouteOptimizer.instance;
  }

  // Intelligent prefetching based on user behavior
  prefetchRoute(route: string): void {
    if (this.prefetchedRoutes.has(route) || typeof window === 'undefined') {
      return;
    }

    this.prefetchedRoutes.add(route);
    
    // Use Next.js router prefetch
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
  }

  // Prefetch likely next routes based on current route
  prefetchLikelyRoutes(currentRoute: string): void {
    const routeMap: Record<string, string[]> = {
      '/dashboard': ['/chat', '/voice', '/vocabulary'],
      '/chat': ['/voice', '/vocabulary', '/dashboard'],
      '/voice': ['/chat', '/vocabulary', '/progress'],
      '/vocabulary': ['/chat', '/goals', '/progress'],
      '/goals': ['/progress', '/vocabulary', '/dashboard'],
      '/progress': ['/goals', '/dashboard', '/settings']
    };

    const likelyRoutes = routeMap[currentRoute] || [];
    likelyRoutes.forEach(route => this.prefetchRoute(route));
  }

  // Cache route data
  cacheRouteData(route: string, data: any): void {
    routeCache.set(route, {
      data,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    });
  }

  // Get cached route data
  getCachedRouteData(route: string): any | null {
    const cached = routeCache.get(route);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      routeCache.delete(route);
      return null;
    }

    return cached.data;
  }

  // Record route performance metrics
  recordRouteMetric(route: string, loadTime: number): void {
    routeMetrics.push({
      route,
      loadTime,
      timestamp: Date.now()
    });

    // Keep only last 100 metrics
    if (routeMetrics.length > 100) {
      routeMetrics.splice(0, routeMetrics.length - 100);
    }
  }

  // Get performance insights
  getPerformanceInsights(): Record<string, number> {
    const insights: Record<string, number> = {};
    
    routeMetrics.forEach(metric => {
      if (!insights[metric.route]) {
        insights[metric.route] = 0;
      }
      insights[metric.route] += metric.loadTime;
    });

    // Calculate averages
    Object.keys(insights).forEach(route => {
      const count = routeMetrics.filter(m => m.route === route).length;
      insights[route] = insights[route] / count;
    });

    return insights;
  }
}

// Custom hook for optimized routing
export function useOptimizedRouter() {
  const router = useRouter();
  const optimizer = RouteOptimizer.getInstance();

  const navigateWithOptimization = useCallback((route: string) => {
    const startTime = performance.now();
    
    // Check cache first
    const cachedData = optimizer.getCachedRouteData(route);
    if (cachedData) {
      console.log(`Using cached data for ${route}`);
    }

    // Navigate
    router.push(route);

    // Record performance
    const endTime = performance.now();
    optimizer.recordRouteMetric(route, endTime - startTime);

    // Prefetch likely next routes
    setTimeout(() => {
      optimizer.prefetchLikelyRoutes(route);
    }, 100);
  }, [router, optimizer]);

  const prefetchRoute = useCallback((route: string) => {
    optimizer.prefetchRoute(route);
  }, [optimizer]);

  return {
    navigate: navigateWithOptimization,
    prefetch: prefetchRoute,
    router
  };
}

// Hook for route performance monitoring
export function useRoutePerformance() {
  const optimizer = RouteOptimizer.getInstance();

  useEffect(() => {
    // Prefetch common routes on app load
    PREFETCH_ROUTES.forEach(route => {
      optimizer.prefetchRoute(route);
    });
  }, [optimizer]);

  return {
    getInsights: () => optimizer.getPerformanceInsights(),
    recordMetric: (route: string, loadTime: number) => 
      optimizer.recordRouteMetric(route, loadTime)
  };
}