import { Router, Request, Response } from 'express';
import { getSupplierAHotels } from '../suppliers/supplier-a';
import { getSupplierBHotels } from '../suppliers/supplier-b';
import { logger } from '../logger';

const router = Router();

router.get('/supplierA/hotels', (req: Request, res: Response) => {
  const city = req.query.city as string | undefined;
  logger.info('Supplier A request', { city });

  const hotels = getSupplierAHotels(city);
  res.json(hotels);
});

router.get('/supplierB/hotels', (req: Request, res: Response) => {
  const city = req.query.city as string | undefined;
  logger.info('Supplier B request', { city });

  const hotels = getSupplierBHotels(city);
  res.json(hotels);
});

export default router;
