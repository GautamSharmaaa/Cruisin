// Governed by .rules v1.0
import { Router, type RequestHandler } from 'express';
import { env } from '../../config/env.js';
import { validate } from '../../middleware/validate.middleware.js';
import { browserOptsOut, canQueueMeta, isStorefrontMetaRequest, metaRequestSignals } from '../../services/meta-attribution.js';
import { enqueueMetaBrowserEvent, recordMetaConsent } from '../../services/meta-conversion.service.js';
import { ApiError } from '../../utils/api-error.js';
import { ApiResponse } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { metaConsentSchema, metaEventSchema, type MetaConsentInput, type MetaEventInput } from '../../validators/meta.validator.js';

const requireStorefront: RequestHandler = (req, res, next): void => {
  res.set('Cache-Control', 'private, no-store');
  if (!isStorefrontMetaRequest(req)) {
    next(new ApiError(403, 'Request origin is not allowed'));
    return;
  }
  next();
};

export const metaRouter = Router();
metaRouter.use(requireStorefront);
metaRouter.post('/consent', validate({ body: metaConsentSchema }), asyncHandler(async (req, res): Promise<void> => {
  const input = req.body as MetaConsentInput;
  const granted = await recordMetaConsent({ ...input, granted: input.granted && !browserOptsOut(req) });
  res.json(new ApiResponse({ granted, capiEnabled: granted && canQueueMeta() }, 'Marketing preference saved'));
}));
metaRouter.post('/events', validate({ body: metaEventSchema }), asyncHandler(async (req, res): Promise<void> => {
  const input = req.body as MetaEventInput;
  const signals = canQueueMeta() && input.pixelId === env.META_PIXEL_ID && !browserOptsOut(req)
    ? metaRequestSignals(req, input)
    : undefined;
  const queued = signals ? await enqueueMetaBrowserEvent(input, signals) : false;
  res.status(queued ? 202 : 200).json(new ApiResponse({ queued }, queued ? 'Event queued' : 'Event skipped'));
}));
