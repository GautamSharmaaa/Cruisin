// Governed by .rules v1.0
import { Router } from 'express';
import { MerchandisingController } from '../../controllers/merchandising.controller.js';
import { requireAdmin, requireRole } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idParamSchema, slugParamSchema } from '../../validators/common.validator.js';
import { collectionBodySchema, megaMenuCollectionCardBodySchema, megaMenuColumnBodySchema, megaMenuLinkBodySchema, megaMenuPromoBodySchema, megaMenuQuerySchema, navigationItemBodySchema, navigationSortSchema, pageSettingsBodySchema, pageSettingsParamSchema, pageSettingsQuerySchema, siteSettingsBodySchema, tagBodySchema } from '../../validators/merchandising.validator.js';

export const navigationRouter = Router();
navigationRouter.get('/', MerchandisingController.navigation);

export const collectionRouter = Router();
collectionRouter.get('/', MerchandisingController.collections);
collectionRouter.get('/:slug', validate({ params: slugParamSchema }), MerchandisingController.collectionBySlug);

export const pageSettingsRouter = Router();
pageSettingsRouter.get('/:pageType', validate({ params: pageSettingsParamSchema }), MerchandisingController.pageSetting);
pageSettingsRouter.get('/:pageType/:pageSlug', validate({ params: pageSettingsParamSchema }), MerchandisingController.pageSetting);

export const siteSettingsRouter = Router();
siteSettingsRouter.get('/', MerchandisingController.siteSettings);

export const tagRouter = Router();
tagRouter.get('/', MerchandisingController.tags);

export const merchandisingAdminRouter = Router();
merchandisingAdminRouter.use(requireAuth, requireAdmin);

merchandisingAdminRouter.get('/navigation', MerchandisingController.adminNavigation);
merchandisingAdminRouter.post('/navigation', requireRole(['admin', 'superadmin', 'manager']), validate({ body: navigationItemBodySchema }), MerchandisingController.createNavigationItem);
merchandisingAdminRouter.post('/navigation/reorder', requireRole(['admin', 'superadmin', 'manager']), validate({ body: navigationSortSchema }), MerchandisingController.reorderNavigationItems);
merchandisingAdminRouter.put('/navigation/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: navigationItemBodySchema.partial() }), MerchandisingController.updateNavigationItem);
merchandisingAdminRouter.delete('/navigation/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema }), MerchandisingController.removeNavigationItem);

merchandisingAdminRouter.get('/mega-menu/columns', validate({ query: megaMenuQuerySchema }), MerchandisingController.columns);
merchandisingAdminRouter.post('/mega-menu/columns', requireRole(['admin', 'superadmin', 'manager']), validate({ body: megaMenuColumnBodySchema }), MerchandisingController.createColumn);
merchandisingAdminRouter.put('/mega-menu/columns/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: megaMenuColumnBodySchema.partial() }), MerchandisingController.updateColumn);
merchandisingAdminRouter.delete('/mega-menu/columns/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema }), MerchandisingController.removeColumn);

merchandisingAdminRouter.get('/mega-menu/links', validate({ query: megaMenuQuerySchema }), MerchandisingController.links);
merchandisingAdminRouter.post('/mega-menu/links', requireRole(['admin', 'superadmin', 'manager']), validate({ body: megaMenuLinkBodySchema }), MerchandisingController.createLink);
merchandisingAdminRouter.put('/mega-menu/links/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: megaMenuLinkBodySchema.partial() }), MerchandisingController.updateLink);
merchandisingAdminRouter.delete('/mega-menu/links/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema }), MerchandisingController.removeLink);

merchandisingAdminRouter.get('/mega-menu/collection-cards', validate({ query: megaMenuQuerySchema }), MerchandisingController.collectionCards);
merchandisingAdminRouter.post('/mega-menu/collection-cards', requireRole(['admin', 'superadmin', 'manager']), validate({ body: megaMenuCollectionCardBodySchema }), MerchandisingController.createCollectionCard);
merchandisingAdminRouter.put('/mega-menu/collection-cards/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: megaMenuCollectionCardBodySchema.partial() }), MerchandisingController.updateCollectionCard);
merchandisingAdminRouter.delete('/mega-menu/collection-cards/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema }), MerchandisingController.removeCollectionCard);

merchandisingAdminRouter.get('/mega-menu/promos', validate({ query: megaMenuQuerySchema }), MerchandisingController.promos);
merchandisingAdminRouter.post('/mega-menu/promos', requireRole(['admin', 'superadmin', 'manager']), validate({ body: megaMenuPromoBodySchema }), MerchandisingController.upsertPromo);
merchandisingAdminRouter.put('/mega-menu/promos/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: megaMenuPromoBodySchema.partial() }), MerchandisingController.updatePromo);
merchandisingAdminRouter.delete('/mega-menu/promos/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema }), MerchandisingController.removePromo);

merchandisingAdminRouter.get('/collections', MerchandisingController.adminCollections);
merchandisingAdminRouter.post('/collections', requireRole(['admin', 'superadmin', 'manager']), validate({ body: collectionBodySchema }), MerchandisingController.createCollection);
merchandisingAdminRouter.put('/collections/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: collectionBodySchema.partial() }), MerchandisingController.updateCollection);
merchandisingAdminRouter.delete('/collections/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema }), MerchandisingController.removeCollection);

merchandisingAdminRouter.get('/page-settings', validate({ query: pageSettingsQuerySchema }), MerchandisingController.pageSettings);
merchandisingAdminRouter.post('/page-settings', requireRole(['admin', 'superadmin', 'manager']), validate({ body: pageSettingsBodySchema }), MerchandisingController.upsertPageSettings);
merchandisingAdminRouter.put('/page-settings/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: pageSettingsBodySchema.partial() }), MerchandisingController.updatePageSettings);

merchandisingAdminRouter.get('/site-settings', MerchandisingController.siteSettings);
merchandisingAdminRouter.put('/site-settings', requireRole(['admin', 'superadmin', 'manager']), validate({ body: siteSettingsBodySchema.partial() }), MerchandisingController.updateSiteSettings);

merchandisingAdminRouter.get('/tags', MerchandisingController.adminTags);
merchandisingAdminRouter.post('/tags', requireRole(['admin', 'superadmin', 'manager']), validate({ body: tagBodySchema }), MerchandisingController.createTag);
merchandisingAdminRouter.put('/tags/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: tagBodySchema.partial() }), MerchandisingController.updateTag);
merchandisingAdminRouter.delete('/tags/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema }), MerchandisingController.removeTag);
