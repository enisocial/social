import React, { useState, useEffect } from 'react';
import { getCacheStats } from '@/services/cache.service';

export const CacheMonitor: React.FC = () => {
  const [stats, setStats] = useState(getCacheStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Ne montrer que en développement
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white text-xs p-3 rounded-xl font-mono z-50 border border-white/20 shadow-xl">
      <div className="font-bold mb-2 text-center text-cyan-400">🚀 ULTRA CACHE</div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Entries:</span>
          <span className="text-green-400">{stats.totalEntries}</span>
        </div>

        <div className="flex justify-between">
          <span>Size:</span>
          <span className="text-blue-400">{(stats.totalSize / 1024 / 1024).toFixed(2)}MB</span>
        </div>

        <div className="flex justify-between">
          <span>Hits:</span>
          <span className="text-yellow-400">{stats.hits} ({stats.hitRate}%)</span>
        </div>

        <div className="flex justify-between">
          <span>Evictions:</span>
          <span className="text-red-400">{stats.evictions}</span>
        </div>

        <div className="flex justify-between">
          <span>Compression:</span>
          <span className="text-purple-400">{stats.efficiency}%</span>
        </div>

        <div className="flex justify-between border-t border-white/20 pt-1 mt-2">
          <span>Avg Size:</span>
          <span className="text-gray-400">{stats.averageEntrySize}B</span>
        </div>
      </div>
    </div>
  );
};
