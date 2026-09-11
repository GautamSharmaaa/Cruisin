// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { MerchandisingService } from '../services/merchandising.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const MerchandisingController = {
  navigation: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const navigation = await MerchandisingService.navigation(false);
    res.json(new ApiResponse(navigation, 'Navigation loaded'));
  }),

  adminNavigation: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const navigation = await MerchandisingService.navigation(true);
    res.json(new ApiResponse(navigation, 'Navigation loaded'));
  }),

  createNavigationItem: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const item = await MerchandisingService.createNavigationItem(req.body);
    res.status(201).json(new ApiResponse(item, 'Navigation item created'));
  }),

  updateNavigationItem: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const item = await MerchandisingService.updateNavigationItem(String(req.params.id ?? ''), req.body);
    res.json(new ApiResponse(item, 'Navigation item updated'));
  }),

  removeNavigationItem: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await MerchandisingService.removeNavigationItem(String(req.params.id ?? ''));
    res.json(new ApiResponse(null, 'Navigation item deleted'));
  }),

  reorderNavigationItems: asyncHandler(async (req: Request<Record<string, string>, unknown, { ids: string[] }>, res: Response): Promise<void> => {
    await MerchandisingService.reorderNavigationItems(req.body.ids);
    res.json(new ApiResponse(null, 'Navigation order updated'));
  }),

  columns: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const columns = await MerchandisingService.columns(typeof req.query.navItemId === 'string' ? req.query.navItemId : undefined);
    res.json(new ApiResponse(columns, 'Mega menu columns loaded'));
  }),

  createColumn: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const column = await MerchandisingService.createColumn(req.body);
    res.status(201).json(new ApiResponse(column, 'Mega menu column created'));
  }),

  updateColumn: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const column = await MerchandisingService.updateColumn(String(req.params.id ?? ''), req.body);
    res.json(new ApiResponse(column, 'Mega menu column updated'));
  }),

  removeColumn: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await MerchandisingService.removeColumn(String(req.params.id ?? ''));
    res.json(new ApiResponse(null, 'Mega menu column deleted'));
  }),

  links: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const links = await MerchandisingService.links(typeof req.query.columnId === 'string' ? req.query.columnId : undefined);
    res.json(new ApiResponse(links, 'Mega menu links loaded'));
  }),

  createLink: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const link = await MerchandisingService.createLink(req.body);
    res.status(201).json(new ApiResponse(link, 'Mega menu link created'));
  }),

  updateLink: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const link = await MerchandisingService.updateLink(String(req.params.id ?? ''), req.body);
    res.json(new ApiResponse(link, 'Mega menu link updated'));
  }),

  removeLink: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await MerchandisingService.removeLink(String(req.params.id ?? ''));
    res.json(new ApiResponse(null, 'Mega menu link deleted'));
  }),

  collectionCards: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const cards = await MerchandisingService.collectionCards(typeof req.query.navItemId === 'string' ? req.query.navItemId : undefined);
    res.json(new ApiResponse(cards, 'Mega menu collection cards loaded'));
  }),

  createCollectionCard: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const card = await MerchandisingService.createCollectionCard(req.body);
    res.status(201).json(new ApiResponse(card, 'Mega menu collection card created'));
  }),

  updateCollectionCard: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const card = await MerchandisingService.updateCollectionCard(String(req.params.id ?? ''), req.body);
    res.json(new ApiResponse(card, 'Mega menu collection card updated'));
  }),

  removeCollectionCard: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await MerchandisingService.removeCollectionCard(String(req.params.id ?? ''));
    res.json(new ApiResponse(null, 'Mega menu collection card deleted'));
  }),

  promos: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const promos = await MerchandisingService.promos(typeof req.query.navItemId === 'string' ? req.query.navItemId : undefined);
    res.json(new ApiResponse(promos, 'Mega menu promos loaded'));
  }),

  upsertPromo: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const promo = await MerchandisingService.upsertPromo(req.body);
    res.json(new ApiResponse(promo, 'Mega menu promo saved'));
  }),

  updatePromo: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const promo = await MerchandisingService.updatePromo(String(req.params.id ?? ''), req.body);
    res.json(new ApiResponse(promo, 'Mega menu promo updated'));
  }),

  removePromo: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await MerchandisingService.removePromo(String(req.params.id ?? ''));
    res.json(new ApiResponse(null, 'Mega menu promo deleted'));
  }),

  collections: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const collections = await MerchandisingService.collections(false);
    res.json(new ApiResponse(collections, 'Collections loaded'));
  }),

  adminCollections: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const collections = await MerchandisingService.collections(true);
    res.json(new ApiResponse(collections, 'Collections loaded'));
  }),

  collectionBySlug: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const collection = await MerchandisingService.collectionBySlug(String(req.params.slug ?? ''), false);
    res.json(new ApiResponse(collection, 'Collection loaded'));
  }),

  createCollection: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const collection = await MerchandisingService.createCollection(req.body);
    res.status(201).json(new ApiResponse(collection, 'Collection created'));
  }),

  updateCollection: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const collection = await MerchandisingService.updateCollection(String(req.params.id ?? ''), req.body);
    res.json(new ApiResponse(collection, 'Collection updated'));
  }),

  removeCollection: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await MerchandisingService.removeCollection(String(req.params.id ?? ''));
    res.json(new ApiResponse(null, 'Collection hidden'));
  }),

  pageSettings: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const settings = await MerchandisingService.pageSettings(req.query as { pageType?: string; pageSlug?: string; page?: number; limit?: number });
    res.json(new ApiResponse(settings, 'Page settings loaded'));
  }),

  pageSetting: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const setting = await MerchandisingService.pageSetting(String(req.params.pageType ?? ''), String(req.params.pageSlug ?? 'index'));
    res.json(new ApiResponse(setting, 'Page settings loaded'));
  }),

  upsertPageSettings: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const settings = await MerchandisingService.upsertPageSettings(req.body);
    res.json(new ApiResponse(settings, 'Page settings saved'));
  }),

  updatePageSettings: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const settings = await MerchandisingService.updatePageSettings(String(req.params.id ?? ''), req.body);
    res.json(new ApiResponse(settings, 'Page settings updated'));
  }),

  siteSettings: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const settings = await MerchandisingService.siteSettings();
    res.json(new ApiResponse(settings, 'Site settings loaded'));
  }),

  updateSiteSettings: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const settings = await MerchandisingService.updateSiteSettings(req.body);
    res.json(new ApiResponse(settings, 'Site settings updated'));
  }),

  updatePaymentSettings: asyncHandler(async (req: Request<Record<string, string>, unknown, { codCheckoutEnabled: boolean; codFee: number }>, res: Response): Promise<void> => {
    const settings = await MerchandisingService.updateSiteSettings(req.body);
    res.json(new ApiResponse(settings, 'COD payment settings updated'));
  }),

  tags: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const tags = await MerchandisingService.tags(false);
    res.json(new ApiResponse(tags, 'Tags loaded'));
  }),

  adminTags: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const tags = await MerchandisingService.tags(true);
    res.json(new ApiResponse(tags, 'Tags loaded'));
  }),

  createTag: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const tag = await MerchandisingService.createTag(req.body);
    res.status(201).json(new ApiResponse(tag, 'Tag created'));
  }),

  updateTag: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const tag = await MerchandisingService.updateTag(String(req.params.id ?? ''), req.body);
    res.json(new ApiResponse(tag, 'Tag updated'));
  }),

  removeTag: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await MerchandisingService.removeTag(String(req.params.id ?? ''));
    res.json(new ApiResponse(null, 'Tag hidden'));
  })
};
