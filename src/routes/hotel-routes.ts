import { Router, Request, Response } from 'express';
import { Connection, Client } from '@temporalio/client';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { getRedisClient } from '../redis-client';
import { logger } from '../logger';
import { HotelOffer } from '../types';
import { hotelOffersWorkflow } from '../temporal/workflows';

const router = Router();
let temporalClient: Client | null = null;

async function getTemporalClient(): Promise<Client> {
  if (!temporalClient) {
    const conn = await Connection.connect({ address: config.temporalAddress });
    temporalClient = new Client({ connection: conn, namespace: config.temporalNamespace });
  }
  return temporalClient;
}

router.get('/api/hotels', async (req: Request, res: Response) => {
  const city = (req.query.city as string | undefined)?.trim().toLowerCase();

  if (!city) {
    res.status(400).json({ error: 'Query parameter "city" is required' });
    return;
  }

  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

  if (minPrice !== undefined && isNaN(minPrice)) {
    res.status(400).json({ error: '"minPrice" must be a valid number' });
    return;
  }
  if (maxPrice !== undefined && isNaN(maxPrice)) {
    res.status(400).json({ error: '"maxPrice" must be a valid number' });
    return;
  }

  try {
    const client = await getTemporalClient();
    const workflowId = `hotel-offers-${city}-${uuidv4()}`;

    logger.info('Starting hotel offers workflow', { workflowId, city });

    const allOffers: HotelOffer[] = await client.workflow.execute(hotelOffersWorkflow, {
      taskQueue: config.temporalTaskQueue,
      workflowId,
      args: [city],
    });

    // if price filter params exist, use Redis sorted set for range query
    if (minPrice !== undefined || maxPrice !== undefined) {
      const redis = getRedisClient();
      const setKey = `hotels:${city}`;
      const lo = minPrice ?? 0;
      const hi = maxPrice ?? '+inf';

      const memberKeys = await redis.zrangebyscore(setKey, lo, hi);

      if (memberKeys.length === 0) {
        res.json([]);
        return;
      }

      const pipeline = redis.pipeline();
      for (const key of memberKeys) {
        pipeline.hgetall(key);
      }
      const results = await pipeline.exec();

      const filtered: HotelOffer[] = [];
      if (results) {
        for (const [err, data] of results) {
          if (!err && data && typeof data === 'object') {
            const record = data as Record<string, string>;
            if (record.name) {
              filtered.push({
                name: record.name,
                price: Number(record.price),
                supplier: record.supplier,
                commissionPct: Number(record.commissionPct),
              });
            }
          }
        }
      }

      logger.info('Returning filtered offers', { city, count: filtered.length, minPrice: lo, maxPrice: hi });
      res.json(filtered);
      return;
    }

    logger.info('Returning offers', { city, count: allOffers.length });
    res.json(allOffers);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Error processing hotel request', { error: message });
    res.status(500).json({ error: 'Failed to fetch hotel offers', details: message });
  }
});

export default router;
