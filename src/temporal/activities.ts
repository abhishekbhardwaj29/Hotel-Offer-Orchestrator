import http from 'http';
import { config } from '../config';
import { HotelListing, SupplierResult, HotelOffer } from '../types';
import { getRedisClient } from '../redis-client';
import { logger } from '../logger';

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        } else {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Request timed out after 5 s'));
    });
  });
}

export async function fetchSupplierA(city: string): Promise<SupplierResult> {
  const url = `${config.supplierABaseUrl}/supplierA/hotels?city=${encodeURIComponent(city)}`;
  logger.info('Fetching Supplier A', { url });

  try {
    const raw = await httpGet(url);
    const hotels: HotelListing[] = JSON.parse(raw);
    logger.info('Supplier A responded', { count: hotels.length });
    return { supplier: 'Supplier A', hotels, healthy: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Supplier A fetch failed', { error: message });
    return { supplier: 'Supplier A', hotels: [], healthy: false, errorMessage: message };
  }
}

export async function fetchSupplierB(city: string): Promise<SupplierResult> {
  const url = `${config.supplierBBaseUrl}/supplierB/hotels?city=${encodeURIComponent(city)}`;
  logger.info('Fetching Supplier B', { url });

  try {
    const raw = await httpGet(url);
    const hotels: HotelListing[] = JSON.parse(raw);
    logger.info('Supplier B responded', { count: hotels.length });
    return { supplier: 'Supplier B', hotels, healthy: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Supplier B fetch failed', { error: message });
    return { supplier: 'Supplier B', hotels: [], healthy: false, errorMessage: message };
  }
}

// merge both supplier lists, keep the cheaper entry when the same hotel appears twice
export async function deduplicateHotels(
  resultA: SupplierResult,
  resultB: SupplierResult,
): Promise<HotelOffer[]> {
  const bestByName = new Map<string, HotelOffer>();

  const processList = (items: HotelListing[], supplierLabel: string) => {
    for (const h of items) {
      const key = h.name.toLowerCase();
      const candidate: HotelOffer = {
        name: h.name,
        price: h.price,
        supplier: supplierLabel,
        commissionPct: h.commissionPct,
      };

      const existing = bestByName.get(key);
      if (!existing || candidate.price < existing.price) {
        bestByName.set(key, candidate);
      }
    }
  };

  processList(resultA.hotels, resultA.supplier);
  processList(resultB.hotels, resultB.supplier);

  const deduplicated = Array.from(bestByName.values());
  logger.info('Deduplication done', { totalOffers: deduplicated.length });
  return deduplicated;
}

// store in redis sorted set (score=price) + individual hashes for full details
export async function cacheInRedis(city: string, offers: HotelOffer[]): Promise<void> {
  const redis = getRedisClient();
  const setKey = `hotels:${city.toLowerCase()}`;

  const pipeline = redis.pipeline();
  pipeline.del(setKey);

  for (const offer of offers) {
    const memberKey = `hotel:${city.toLowerCase()}:${offer.name.toLowerCase()}`;

    pipeline.zadd(setKey, offer.price, memberKey);
    pipeline.hset(memberKey, {
      name: offer.name,
      price: String(offer.price),
      supplier: offer.supplier,
      commissionPct: String(offer.commissionPct),
    });
    pipeline.expire(memberKey, config.redisCacheTtl);
  }

  pipeline.expire(setKey, config.redisCacheTtl);
  await pipeline.exec();

  logger.info('Cached in Redis', { city, count: offers.length });
}
