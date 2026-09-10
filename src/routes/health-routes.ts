import { Router, Request, Response } from 'express';
import http from 'http';
import { config } from '../config';
import { getRedisClient } from '../redis-client';
import { Connection } from '@temporalio/client';
import { HealthStatus } from '../types';
import { logger } from '../logger';

const router = Router();
const startedAt = Date.now();

function probeHttp(url: string): Promise<{ reachable: boolean; latencyMs: number }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve({ reachable: res.statusCode !== undefined && res.statusCode < 500, latencyMs: Date.now() - start });
    });
    req.on('error', () => resolve({ reachable: false, latencyMs: Date.now() - start }));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ reachable: false, latencyMs: Date.now() - start });
    });
  });
}

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const [supplierA, supplierB] = await Promise.all([
      probeHttp(`${config.supplierABaseUrl}/supplierA/hotels?city=delhi`),
      probeHttp(`${config.supplierBBaseUrl}/supplierB/hotels?city=delhi`),
    ]);

    let redisConnected = false;
    try {
      const redis = getRedisClient();
      const pong = await redis.ping();
      redisConnected = pong === 'PONG';
    } catch {
      redisConnected = false;
    }

    let temporalConnected = false;
    try {
      const conn = await Connection.connect({ address: config.temporalAddress });
      temporalConnected = true;
      conn.close();
    } catch {
      temporalConnected = false;
    }

    const allUp = supplierA.reachable && supplierB.reachable && redisConnected && temporalConnected;
    const someUp = supplierA.reachable || supplierB.reachable;

    const body: HealthStatus = {
      status: allUp ? 'healthy' : someUp ? 'degraded' : 'unhealthy',
      uptime: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      suppliers: { supplierA, supplierB },
      redis: { connected: redisConnected },
      temporal: { connected: temporalConnected },
    };

    const httpCode = allUp ? 200 : 503;
    res.status(httpCode).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Health check failed', { error: message });
    res.status(503).json({ status: 'unhealthy', error: message });
  }
});

export default router;
