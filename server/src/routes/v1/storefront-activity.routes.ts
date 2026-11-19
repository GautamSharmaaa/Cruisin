// Governed by .rules v1.0
import { Router } from 'express';
import { z } from 'zod';
import { requireBrowserOrigin } from '../../middleware/browser-origin.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { recordStorefrontActivity } from '../../services/storefront-activity.service.js';
import { asyncHandler } from '../../utils/async-handler.js';

const event = z.object({
  visitId: z.string().uuid().transform(value => value.toLowerCase()),
  kind: z.enum(['visit', 'bag']),
  device: z.enum(['mobile', 'desktop'])
}).strict();

export const storefrontActivityRouter = Router();
storefrontActivityRouter.post('/', requireBrowserOrigin, validate({ body: event }), asyncHandler(async (req, res) => {
  await recordStorefrontActivity(req.body as z.infer<typeof event>);
  res.status(204).end();
}));
