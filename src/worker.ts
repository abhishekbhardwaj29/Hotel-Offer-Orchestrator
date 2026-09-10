import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './temporal/activities';
import { config } from './config';
import { logger } from './logger';

async function runWorker(): Promise<void> {
  logger.info('Starting Temporal worker', {
    taskQueue: config.temporalTaskQueue,
    temporalAddress: config.temporalAddress,
  });

  const connection = await NativeConnection.connect({
    address: config.temporalAddress,
  });

  const worker = await Worker.create({
    workflowsPath: require.resolve('./temporal/workflows'),
    activities,
    taskQueue: config.temporalTaskQueue,
    connection,
  });

  logger.info('Temporal worker listening for tasks');
  await worker.run();
}

runWorker().catch((err) => {
  logger.error('Worker crashed', { error: err });
  process.exit(1);
});
