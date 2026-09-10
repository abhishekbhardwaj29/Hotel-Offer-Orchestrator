import express from 'express';
import { config } from './config';
import { logger } from './logger';
import { disconnectRedis } from './redis-client';

import supplierRoutes from './routes/supplier-routes';
import hotelRoutes from './routes/hotel-routes';
import healthRoutes from './routes/health-routes';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

app.use(supplierRoutes);
app.use(hotelRoutes);
app.use(healthRoutes);

const server = app.listen(config.port, () => {
  logger.info(`Hotel Orchestrator API listening on port ${config.port}`);
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down`);
  server.close(async () => {
    await disconnectRedis();
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
