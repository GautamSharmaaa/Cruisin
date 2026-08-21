// Governed by .rules v1.0
import { LogisticsJobService } from './logistics/logistics-job.service.js';
import { logger } from '../utils/logger.js';

export const startDurableJobProcessor = (pollMilliseconds = 1_000): (() => void) => {
  let running = false;
  let stopped = false;
  const tick = async (): Promise<void> => {
    if (running || stopped) return;
    running = true;
    try {
      for (let count = 0; count < 10 && await LogisticsJobService.processNext(); count += 1) { /* drain bounded work */ }
    } catch (error) {
      logger.error('Durable background job processor tick failed', { error });
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => { void tick(); }, pollMilliseconds);
  timer.unref();
  void tick();
  return () => { stopped = true; clearInterval(timer); };
};
