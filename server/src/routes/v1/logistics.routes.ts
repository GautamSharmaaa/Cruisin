// Governed by .rules v1.0
import { Router } from 'express';
import { LogisticsController } from '../../controllers/logistics.controller.js';
import { requireAdmin, requireRole } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  courierSelectionSchema,
  documentParamSchema,
  logisticsAnalyticsQuerySchema,
  logisticsListQuerySchema,
  logisticsQuoteSchema,
  ndrActionSchema,
  orderIdParamSchema,
  packageConfirmationSchema,
  rtoWarehouseSchema,
  shipmentIdParamSchema
} from '../../validators/logistics.validator.js';

export const logisticsRouter = Router();
logisticsRouter.post('/quotes', requireAuth, validate({ body: logisticsQuoteSchema }), LogisticsController.quote);

export const adminLogisticsRouter = Router();
adminLogisticsRouter.use(requireAuth, requireAdmin);
adminLogisticsRouter.get('/', validate({ query: logisticsListQuerySchema }), LogisticsController.list);
adminLogisticsRouter.get('/kpis', LogisticsController.kpis);
adminLogisticsRouter.get('/sync-health', LogisticsController.syncHealth);
adminLogisticsRouter.get('/analytics', validate({ query: logisticsAnalyticsQuerySchema }), LogisticsController.analytics);
adminLogisticsRouter.get('/ndr', validate({ query: logisticsListQuerySchema }), LogisticsController.ndr);
adminLogisticsRouter.get('/rto', validate({ query: logisticsListQuerySchema }), LogisticsController.rto);
adminLogisticsRouter.get('/jobs', validate({ query: logisticsListQuerySchema.omit({ type: true, search: true }) }), LogisticsController.jobs);
adminLogisticsRouter.get('/notifications', validate({ query: logisticsListQuerySchema.omit({ type: true, search: true }) }), LogisticsController.notifications);
adminLogisticsRouter.get('/:shipmentId/documents/:kind', validate({ params: documentParamSchema }), LogisticsController.documentAccess);
adminLogisticsRouter.get('/:shipmentId', validate({ params: shipmentIdParamSchema }), LogisticsController.byId);
adminLogisticsRouter.post('/orders/:orderId/create', requireRole(['manager', 'admin', 'superadmin']), validate({ params: orderIdParamSchema }), LogisticsController.createOrder);
adminLogisticsRouter.post('/:shipmentId/package/confirm', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema, body: packageConfirmationSchema }), LogisticsController.confirmPackage);
adminLogisticsRouter.post('/:shipmentId/compare-couriers', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema }), LogisticsController.compareCouriers);
adminLogisticsRouter.post('/:shipmentId/assign-awb', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema, body: courierSelectionSchema }), LogisticsController.assignAwb);
adminLogisticsRouter.post('/:shipmentId/schedule-pickup', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema }), LogisticsController.schedulePickup);
adminLogisticsRouter.post('/:shipmentId/label', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema }), LogisticsController.document('label'));
adminLogisticsRouter.post('/:shipmentId/invoice', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema }), LogisticsController.document('invoice'));
adminLogisticsRouter.post('/:shipmentId/manifest', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema }), LogisticsController.document('manifest'));
adminLogisticsRouter.post('/:shipmentId/track', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema }), LogisticsController.track);
adminLogisticsRouter.post('/:shipmentId/sync', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema }), LogisticsController.sync);
adminLogisticsRouter.post('/:shipmentId/cancel', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema }), LogisticsController.cancel);
adminLogisticsRouter.post('/:shipmentId/ndr/action', requireRole(['manager', 'admin', 'superadmin']), validate({ params: shipmentIdParamSchema, body: ndrActionSchema }), LogisticsController.ndrAction);
adminLogisticsRouter.post('/:shipmentId/rto/warehouse', requireRole(['admin', 'superadmin']), validate({ params: shipmentIdParamSchema, body: rtoWarehouseSchema }), LogisticsController.rtoWarehouse);
