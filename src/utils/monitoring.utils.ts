// Performance monitoring utilities for production

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics in memory

  // Measure function execution time
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      
      // Log slow operations (>1s)
      if (duration > 1000) {
        console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  // Measure async function execution time
  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      
      if (duration > 1000) {
        console.warn(`Slow async operation: ${name} took ${duration.toFixed(2)}ms`, metadata);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  private recordMetric(name: string, duration: number, metadata?: Record<string, any>) {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  // Get metrics summary
  getSummary() {
    const summary = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0,
        };
      }
      
      const stats = acc[metric.name];
      stats.count++;
      stats.total += metric.duration;
      stats.min = Math.min(stats.min, metric.duration);
      stats.max = Math.max(stats.max, metric.duration);
      stats.avg = stats.total / stats.count;
      
      return acc;
    }, {} as Record<string, any>);

    return summary;
  }

  // Clear metrics
  clear() {
    this.metrics = [];
  }

  // Get recent slow operations
  getSlowOperations(threshold = 1000) {
    return this.metrics
      .filter(m => m.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
  }
}

// Error tracking
class ErrorTracker {
  private errors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
    metadata?: Record<string, any>;
  }> = [];
  private maxErrors = 50;

  track(error: Error, metadata?: Record<string, any>) {
    console.error('Error tracked:', error.message, metadata);
    
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      metadata,
    });

    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit).reverse();
  }

  clear() {
    this.errors = [];
  }
}

// API call tracker
class APITracker {
  private calls: Array<{
    endpoint: string;
    method: string;
    duration: number;
    status: number;
    timestamp: number;
  }> = [];
  private maxCalls = 100;

  track(endpoint: string, method: string, duration: number, status: number) {
    this.calls.push({
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now(),
    });

    if (this.calls.length > this.maxCalls) {
      this.calls.shift();
    }

    // Log slow API calls
    if (duration > 2000) {
      console.warn(`Slow API call: ${method} ${endpoint} took ${duration.toFixed(2)}ms`);
    }
  }

  getSummary() {
    const summary = this.calls.reduce((acc, call) => {
      const key = `${call.method} ${call.endpoint}`;
      if (!acc[key]) {
        acc[key] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          errors: 0,
        };
      }
      
      const stats = acc[key];
      stats.count++;
      stats.totalDuration += call.duration;
      stats.avgDuration = stats.totalDuration / stats.count;
      if (call.status >= 400) stats.errors++;
      
      return acc;
    }, {} as Record<string, any>);

    return summary;
  }

  clear() {
    this.calls = [];
  }
}

// Global monitoring instances
export const performanceMonitor = new PerformanceMonitor();
export const errorTracker = new ErrorTracker();
export const apiTracker = new APITracker();

// Helper to log all monitoring data
export const getMonitoringReport = () => {
  return {
    performance: performanceMonitor.getSummary(),
    slowOperations: performanceMonitor.getSlowOperations(),
    recentErrors: errorTracker.getRecentErrors(),
    apiCalls: apiTracker.getSummary(),
    timestamp: new Date().toISOString(),
  };
};
