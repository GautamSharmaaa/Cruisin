// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { CmsService } from '../services/cms.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const CmsController = {
  listPages: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const pages = await CmsService.listPages(); res.json(new ApiResponse(pages, 'CMS pages loaded')); }),
  createPage: asyncHandler(async (req: Request<Record<string, string>, unknown, { slug: string; title: string; status?: 'draft' | 'published' | 'archived'; seoTitle?: string; seoDescription?: string }>, res: Response): Promise<void> => { const page = await CmsService.createPage(req.body); res.status(201).json(new ApiResponse(page, 'CMS page created')); }),
  pageBySlug: asyncHandler(async (req: Request<{ slug: string }>, res: Response): Promise<void> => { const page = await CmsService.pageBySlug(req.params.slug); res.json(new ApiResponse(page, 'CMS page loaded')); }),
  publicPage: asyncHandler(async (req: Request<{ slug: string }>, res: Response): Promise<void> => { const page = await CmsService.publicPage(req.params.slug, req.query as { previewToken?: string; includeInactive?: boolean; scheduledAt?: Date }); res.json(new ApiResponse(page, 'CMS page experience loaded')); }),
  listSections: asyncHandler(async (req: Request<{ pageId: string }>, res: Response): Promise<void> => { const sections = await CmsService.listSections(req.params.pageId); res.json(new ApiResponse(sections, 'CMS sections loaded')); }),
  createSection: asyncHandler(async (req: Request<{ pageId: string }, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const section = await CmsService.createSection(req.params.pageId, req.body); res.status(201).json(new ApiResponse(section, 'CMS section created')); }),
  updateSection: asyncHandler(async (req: Request<{ id: string }, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const section = await CmsService.updateSection(req.params.id, req.body); res.json(new ApiResponse(section, 'CMS section updated')); }),
  archiveSection: asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => { await CmsService.archiveSection(req.params.id); res.json(new ApiResponse(null, 'CMS section archived')); }),
  reorderSections: asyncHandler(async (req: Request<{ pageId: string }, unknown, { ids: string[] }>, res: Response): Promise<void> => { await CmsService.reorderSections(req.params.pageId, req.body.ids); res.json(new ApiResponse(null, 'CMS order updated')); }),
  publishPage: asyncHandler(async (req: Request<{ pageId: string }>, res: Response): Promise<void> => { const version = await CmsService.publishPage(req.params.pageId, req.user?.userId); res.json(new ApiResponse(version, 'CMS page published')); }),
  listVersions: asyncHandler(async (req: Request<{ pageId: string }>, res: Response): Promise<void> => { const versions = await CmsService.listVersions(req.params.pageId); res.json(new ApiResponse(versions, 'CMS versions loaded')); }),
  restoreVersion: asyncHandler(async (req: Request<{ pageId: string }, unknown, { versionId: string }>, res: Response): Promise<void> => { const sections = await CmsService.restoreVersion(req.params.pageId, req.body.versionId); res.json(new ApiResponse(sections, 'CMS version restored')); }),
  listMedia: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const media = await CmsService.listMedia(); res.json(new ApiResponse(media, 'CMS media loaded')); }),
  createMedia: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const media = await CmsService.createMedia(req.body); res.status(201).json(new ApiResponse(media, 'CMS media saved')); }),
  listBanners: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const banners = await CmsService.listBanners(); res.json(new ApiResponse(banners, 'CMS banners loaded')); }),
  home: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const banners = await CmsService.activeHome(); res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300'); res.json(new ApiResponse(banners, 'Home CMS loaded')); }),
  createBanner: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const banner = await CmsService.upsertBanner(req.body); res.status(201).json(new ApiResponse(banner, 'Banner created')); }),
  reorder: asyncHandler(async (req: Request<Record<string, string>, unknown, { ids: string[] }>, res: Response): Promise<void> => { await CmsService.reorder(req.body.ids); res.json(new ApiResponse(null, 'CMS order updated')); })
};
