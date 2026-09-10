import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import type { HotelOffer } from '../types';

// need to use proxyActivities because workflow code runs in a deterministic sandbox
const {
  fetchSupplierA,
  fetchSupplierB,
  deduplicateHotels,
  cacheInRedis,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '15 seconds',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export async function hotelOffersWorkflow(city: string): Promise<HotelOffer[]> {
  // fetch both suppliers in parallel
  const [resultA, resultB] = await Promise.all([
    fetchSupplierA(city),
    fetchSupplierB(city),
  ]);

  const offers = await deduplicateHotels(resultA, resultB);
  await cacheInRedis(city, offers);

  return offers;
}
