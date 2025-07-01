import { Injectable } from '@nestjs/common';

@Injectable()
export class MonitoringService {
  getSystemStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
    };
  }

  getMetrics() {
    const memUsage = process.memoryUsage();
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
  }
} 