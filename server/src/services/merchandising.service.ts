// Governed by .rules v1.0
import { CategoryModel } from '../models/category.model.js';
import { CollectionModel } from '../models/collection.model.js';
import { MegaMenuCollectionCardModel, MegaMenuColumnModel, MegaMenuLinkModel, MegaMenuPromoModel, NavigationItemModel } from '../models/navigation.model.js';
import { PageSettingsModel } from '../models/page-settings.model.js';
import { SiteSettingsModel } from '../models/site-settings.model.js';
import { TagModel } from '../models/tag.model.js';
import { ApiError } from '../utils/api-error.js';
import type { PaginatedResult } from '../types/api.types.js';
import { CatalogueHistoryService } from './catalogueHistory.service.js';

export type MerchandisingInput = Record<string, unknown>;
const markCatalogueStale = (): void => { CatalogueHistoryService.markStale().catch(() => undefined); };

const imageBase = 'https://images.unsplash.com';
const defaultImage = imageBase + '/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85';

const slugify = (value: string): string => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const menuGroups = [
  {
    label: 'New & Featured',
    slug: 'new-featured',
    href: '/new-featured',
    menuLayoutType: 'text-columns',
    columns: [
      { title: 'New In', links: ['New Arrivals', 'Bestsellers', 'Latest Drop', 'Limited Edition', 'View All New In'] },
      { title: 'Featured', links: ['Top Picks Under ₹4999', 'Best Sellers', 'Trending Now', 'Editor’s Picks', 'View All Featured'] },
      { title: 'Clothing', links: ['T-Shirts', 'Hoodies', 'Shirts', 'Jackets', 'Pants', 'Joggers', 'View All Clothing'] },
      { title: 'Accessories', links: ['Bags', 'Caps', 'Socks', 'Wallets', 'Jewellery', 'Sunglasses', 'View All Accessories'] }
    ]
  },
  {
    label: 'Men',
    slug: 'men',
    href: '/men',
    menuLayoutType: 'text-columns',
    columns: [
      { title: 'New In', links: ['New Arrivals', 'Bestsellers', 'Latest Drop', 'View All Men'] },
      { title: 'Clothing', links: ['T-Shirts', 'Oversized T-Shirts', 'Shirts', 'Hoodies & Sweatshirts', 'Jackets', 'Cargo Pants', 'Joggers', 'Pants', 'View All Clothing'] },
      { title: 'Shop By Style', links: ['Streetwear', 'Lifestyle', 'Oversized Fits', 'Essentials', 'Gym & Training', 'Running'] },
      { title: 'Accessories', links: ['Caps', 'Bags', 'Socks', 'Wallets', 'View All Accessories'] }
    ]
  },
  {
    label: 'Women',
    slug: 'women',
    href: '/women',
    menuLayoutType: 'text-columns',
    columns: [
      { title: 'New In', links: ['New Arrivals', 'Bestsellers', 'Latest Drop', 'View All Women'] },
      { title: 'Clothing', links: ['T-Shirts', 'Crop Tops', 'Hoodies & Sweatshirts', 'Jackets', 'Pants & Leggings', 'Joggers', 'Dresses', 'Shorts', 'Sweatshirts', 'View All Clothing'] },
      { title: 'Shop By Style', links: ['Streetwear', 'Lifestyle', 'Oversized Fits', 'Essentials', 'Gym & Training', 'Yoga'] },
      { title: 'Accessories', links: ['Bags', 'Caps', 'Socks', 'Wallets', 'Jewellery', 'Sunglasses', 'View All Accessories'] }
    ]
  },
  {
    label: 'Sale',
    slug: 'sale',
    href: '/sale',
    menuLayoutType: 'text-columns',
    columns: [
      { title: 'Sale & Offers', links: ['Shop All Sale', 'New Markdowns', 'Best Deals', 'Last Chance'] },
      { title: 'Men’s Sale', links: ['T-Shirts', 'Hoodies', 'Pants', 'Accessories', 'View All Men’s Sale'] },
      { title: 'Women’s Sale', links: ['T-Shirts', 'Crop Tops', 'Hoodies', 'Pants', 'Accessories', 'View All Women’s Sale'] },
      { title: 'Shop By Style', links: ['Streetwear', 'Gym & Training', 'Oversized Fits', 'Essentials'] }
    ]
  },
  {
    label: 'Collections',
    slug: 'collections',
    href: '/collections',
    menuLayoutType: 'collection-grid',
    columns: []
  }
] as const;

const promoSeeds = {
  'new-featured': { eyebrow: 'New Drop', title: 'Quiet Uniform', subtitle: 'Timeless pieces designed for everyday.', buttonLabel: 'Explore Collection', buttonHref: '/collections/quiet-uniform' },
  men: { eyebrow: 'Men', title: 'Black Transit', subtitle: 'Clean black layers for city movement.', buttonLabel: 'Shop Men', buttonHref: '/men' },
  women: { eyebrow: 'New Drop', title: 'Quiet Uniform', subtitle: 'Timeless pieces designed for everyday.', buttonLabel: 'Shop Women', buttonHref: '/women' },
  sale: { eyebrow: 'Limited Time', title: 'Up to 50% Off', subtitle: 'Selected pieces only.', buttonLabel: 'Shop Sale', buttonHref: '/sale' },
  collections: { eyebrow: 'Featured Collection', title: 'Quiet Uniform', subtitle: 'Timeless pieces designed for everyday.', buttonLabel: 'Explore Collection', buttonHref: '/collections/quiet-uniform' }
} as const;

const collectionSeeds = [
  ['Black Transit', imageBase + '/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85'],
  ['Quiet Uniform', imageBase + '/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85'],
  ['Valentine Special', imageBase + '/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85'],
  ['Winter Collection', imageBase + '/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=85'],
  ['Racing Club', imageBase + '/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1200&q=85'],
  ['Basics', imageBase + '/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85'],
  ['Yacht Collection', imageBase + '/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85'],
  ['Latest Drop', imageBase + '/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85']
] as const;
const menuCollectionTitles = ['Quiet Uniform', 'Black Transit', 'Valentine Special', 'Winter Collection', 'Racing Club', 'Basics'] as const;

const pageSettingsSeeds = [
  { pageType: 'landing', pageSlug: 'new-featured', title: 'New & Featured', subtitle: 'Fresh arrivals, latest drops, bestsellers, and the pieces moving through Cruisin right now.' },
  { pageType: 'landing', pageSlug: 'men', title: 'Men', subtitle: 'Streetwear essentials, quiet statement layers, and utility silhouettes.' },
  { pageType: 'landing', pageSlug: 'women', title: 'Women', subtitle: 'Clean silhouettes, sharp layers, and elevated daily uniform pieces.' },
  { pageType: 'landing', pageSlug: 'sale', title: 'Sale', subtitle: 'Private markdowns and last-chance pieces from the Cruisin catalogue.' },
  { pageType: 'collections', pageSlug: 'index', title: 'Collections', subtitle: 'Editorial capsules and product stories curated by the Cruisin team.' }
] as const;

const chipSeeds = ['View All', 'Accessories', 'Caps', 'Cargo', 'Crop Top', 'Denims', 'Hoodies', 'Jackets', 'Jersey', 'Joggers', 'Latest Drop', 'Pants', 'Polo', 'T-Shirts'];

const categorySeeds = [
  { name: 'Men', slug: 'men', children: [
    'T-Shirts', 'Oversized T-Shirts', 'Hoodies', 'Shirts', 'Jackets', 'Cargo Pants', 'Joggers', 'Pants',
    { name: 'Accessories', slug: 'accessories', children: ['Caps', 'Bags', 'Socks', 'Wallets'] }
  ] },
  { name: 'Women', slug: 'women', children: [
    'T-Shirts', 'Crop Tops', 'Hoodies', 'Jackets', 'Pants & Leggings', 'Joggers', 'Dresses',
    { name: 'Accessories', slug: 'accessories', children: ['Caps', 'Bags', 'Socks', 'Hair Accessories'] }
  ] },
  { name: 'Sale', slug: 'sale', children: ['Men Sale', 'Women Sale', 'Accessories Sale', 'Last Chance', 'New Markdowns'] },
  { name: 'Accessories', slug: 'accessories', children: ['Caps', 'Bags', 'Socks', 'Wallets', 'Hair Accessories'] },
  { name: 'Collections', slug: 'collections', children: ['Black Transit', 'Quiet Uniform', 'Valentine Special', 'Winter Collection', 'Racing Club', 'Basics', 'Yacht Collection', 'Latest Drop'] }
] as const;

const menuHref = (navSlug: string, label: string): { href: string; linkedType: 'category' | 'collection' | 'static_page' | 'custom_url' } => {
  const slug = slugify(label.replace(/^view all/i, '').trim() || label);
  if (label.toLowerCase().includes('view all')) return { href: navSlug === 'collections' ? '/collections' : '/' + navSlug, linkedType: 'static_page' };
  if (['new-arrivals', 'bestsellers', 'latest-drop'].includes(slug)) return { href: '/new-featured?' + slug + '=true', linkedType: 'static_page' };
  if (navSlug === 'collections') return { href: '/collections/' + slug, linkedType: 'collection' };
  if (label.toLowerCase() === 'sale') return { href: '/sale', linkedType: 'static_page' };
  const root = ['men', 'women', 'sale'].includes(navSlug) ? navSlug : 'category';
  return { href: root === 'category' ? '/category/' + slug : '/category/' + root + '/' + slug, linkedType: 'category' };
};

const clearNavColumns = async (navItemId: unknown): Promise<void> => {
  const columns = await MegaMenuColumnModel.find({ navItemId }).select('_id').lean();
  await MegaMenuLinkModel.deleteMany({ columnId: { $in: columns.map((column) => column._id) } });
  await MegaMenuColumnModel.deleteMany({ navItemId });
};

const seedColumnsForNav = async (navItemId: unknown, group: (typeof menuGroups)[number]): Promise<void> => {
  for (const [columnIndex, column] of group.columns.entries()) {
    const menuColumn = await MegaMenuColumnModel.create({ navItemId, title: column.title, sortOrder: columnIndex, isVisible: true });
    await MegaMenuLinkModel.insertMany(column.links.map((label, linkIndex) => {
      const href = menuHref(group.slug, label);
      return {
        columnId: menuColumn._id,
        label,
        href: href.href,
        linkedType: href.linkedType,
        sortOrder: linkIndex,
        isVisible: true,
        isHighlighted: label.toLowerCase().includes('latest') || label.toLowerCase().includes('limited'),
        showArrow: label.toLowerCase().startsWith('view all')
      };
    }));
  }
};

const seedNavigation = async (): Promise<void> => {
  for (const [navIndex, group] of menuGroups.entries()) {
    let nav = await NavigationItemModel.findOne({ slug: group.slug }).select('_id slug').lean();
    if (!nav) {
      nav = await NavigationItemModel.create({
        label: group.label,
        slug: group.slug,
        href: group.href,
        type: 'mega_menu',
        menuLayoutType: group.menuLayoutType,
        sortOrder: navIndex,
        isVisible: true,
        isMegaMenuEnabled: true,
        isDefaultActive: navIndex === 0
      });
      await seedColumnsForNav(nav._id, group);
      continue;
    }

    const columns = await MegaMenuColumnModel.find({ navItemId: nav._id }).select('title').lean();
    if (columns.length > 0) continue;
    const titleCounts = new Map<string, number>();
    for (const column of columns) {
      const key = column.title.toLowerCase();
      titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
    }
    const hasDuplicateColumns = [...titleCounts.values()].some((count) => count > 1);
    const hasWrongColumnCount = group.slug !== 'collections' && columns.length !== group.columns.length;
    const hasLegacyColumns = group.slug === 'new-featured'
      ? columns.some((column) => column.title.toLowerCase() === 'trending')
      : group.slug === 'collections'
        ? columns.length > 0
        : columns.some((column) => column.title.toLowerCase() === 'featured' || column.title.toLowerCase().includes('sport'));
    const links = await MegaMenuLinkModel.find({ columnId: { $in: columns.map((column) => column._id) } }).select('href linkedType').lean();
    const hasCollectionLinksInTextTab = group.slug !== 'collections' && links.some((link) => link.href.startsWith('/collections/') || link.linkedType === 'collection');
    if (hasLegacyColumns || hasDuplicateColumns || hasWrongColumnCount || hasCollectionLinksInTextTab || (group.slug !== 'collections' && columns.length === 0)) {
      await clearNavColumns(nav._id);
      await seedColumnsForNav(nav._id, group);
    }
  }
};

const seedCollections = async (): Promise<void> => {
  const count = await CollectionModel.countDocuments();
  if (count > 0) return;
  await CollectionModel.insertMany(collectionSeeds.map(([title, image], index) => ({
    title,
    slug: slugify(title),
    description: title + ' collection from the Cruisin catalogue.',
    heroImage: image,
    cardImage: image,
    thumbnailImage: image,
    bannerImage: image,
    mobileImage: image,
    sortOrder: index,
    isVisible: true,
    isFeatured: index < 5,
    seoTitle: title + ' | Cruisin',
    seoDescription: 'Shop ' + title + ' from Cruisin.'
  })));
};

const seedTags = async (): Promise<void> => {
  const count = await TagModel.countDocuments();
  if (count > 0) return;
  await TagModel.insertMany(chipSeeds.map((name, index) => ({ name, slug: slugify(name), sortOrder: index, isVisible: true })));
};

const dropLegacyCategorySlugUniqueIndex = async (): Promise<void> => {
  const indexes = await CategoryModel.collection.indexes();
  const legacy = indexes.find((index) => index.name === 'slug_1' && index.unique);
  if (legacy) await CategoryModel.collection.dropIndex('slug_1');
};

type CategorySeed = string | { name: string; slug?: string; children?: readonly CategorySeed[] };

const seedCategoryNode = async (seed: CategorySeed, parent: { _id: unknown; path: string; breadcrumb: Array<{ name: string; slug: string }> } | null, sortOrder: number): Promise<void> => {
  const name = typeof seed === 'string' ? seed : seed.name;
  const slug = typeof seed === 'string' ? slugify(seed) : seed.slug ?? slugify(seed.name);
  const path = parent ? parent.path + '/' + slug : slug;
  const breadcrumb = [...(parent?.breadcrumb ?? []), { name, slug }];
  const category = await CategoryModel.findOneAndUpdate(
    { path },
    {
      $setOnInsert: {
        name,
        slug,
        path,
        parent: parent?._id ?? null,
        image: defaultImage,
        description: 'Shop ' + name + ' from the Cruisin catalogue.',
        heroTitle: name,
        heroSubtitle: 'Admin-managed Cruisin category page.',
        thumbnailImage: defaultImage,
        sortOrder,
        isActive: true,
        isVisible: true,
        isFeatured: sortOrder < 3,
        showInHeader: !parent,
        showInFilters: true,
        showOnHomepage: !parent && ['men', 'women', 'collections'].includes(slug),
        defaultSort: 'newest',
        defaultGridView: 4,
        seoTitle: name + ' | Cruisin',
        seoDescription: 'Shop ' + name + ' from Cruisin.',
        breadcrumb
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  const children = typeof seed === 'string' ? [] : seed.children ?? [];
  for (const [index, child] of children.entries()) {
    await seedCategoryNode(child, { _id: category._id, path, breadcrumb }, index);
  }
};

const seedCategories = async (): Promise<void> => {
  await dropLegacyCategorySlugUniqueIndex();
  for (const [index, seed] of categorySeeds.entries()) {
    await seedCategoryNode(seed, null, index);
  }
};

const seedPageSettings = async (): Promise<void> => {
  const count = await PageSettingsModel.countDocuments();
  if (count > 0) return;
  await PageSettingsModel.insertMany(pageSettingsSeeds.map((page) => ({
    ...page,
    heroImage: defaultImage,
    mobileHeroImage: defaultImage,
    bannerImage: '',
    isBannerVisible: false,
    defaultSort: 'newest',
    defaultGridView: 4,
    areFiltersVisible: true,
    isAdvancedFilterEnabled: true,
    isFlashlightEnabled: true,
    seoTitle: page.title + ' | Cruisin',
    seoDescription: page.subtitle,
    isPublished: true
  })));
};

const seedSiteSettings = async (): Promise<void> => {
  await SiteSettingsModel.findOneAndUpdate(
    { singletonKey: 'global' },
    { $setOnInsert: { singletonKey: 'global', defaultGridView: 4, isFlashlightEnabled: true, isCollectionCarouselEnabled: true, isAdvancedFilterEnabled: true, isStorefrontNavigationVisible: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const seedMenuCardsAndPromos = async (): Promise<void> => {
  const navItems = await NavigationItemModel.find({ slug: { $in: menuGroups.map((group) => group.slug) } }).lean();
  const collectionOrder = menuCollectionTitles.map((title) => slugify(title));
  const collections = (await CollectionModel.find({ slug: { $in: collectionOrder } }).lean())
    .sort((left, right) => collectionOrder.indexOf(left.slug) - collectionOrder.indexOf(right.slug));
  const featuredCollection = collections.find((collection) => collection.slug === 'quiet-uniform') ?? collections[0];
  const featuredImage = featuredCollection?.cardImage || featuredCollection?.thumbnailImage || featuredCollection?.heroImage || defaultImage;

  for (const nav of navItems) {
    const seed = promoSeeds[nav.slug as keyof typeof promoSeeds];
    if (!seed) continue;
    await MegaMenuPromoModel.findOneAndUpdate(
      { navItemId: nav._id },
      {
        $setOnInsert: {
          navItemId: nav._id,
          ...seed,
          image: nav.slug === 'sale' ? collectionSeeds[2][1] : featuredImage,
          mobileImage: nav.slug === 'sale' ? collectionSeeds[2][1] : featuredImage,
          overlayOpacity: 0.5,
          showOnDesktop: true,
          showOnMobile: true,
          isVisible: true
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const collectionsNav = navItems.find((item) => item.slug === 'collections');
  if (!collectionsNav) return;
  const cardCount = await MegaMenuCollectionCardModel.countDocuments({ navItemId: collectionsNav._id });
  if (cardCount > 0) {
    await Promise.all(collections.map((collection, index) => MegaMenuCollectionCardModel.updateMany(
      { navItemId: collectionsNav._id, collectionId: collection._id, titleOverride: '' },
      { sortOrder: index }
    )));
    return;
  }
  await MegaMenuCollectionCardModel.insertMany(collections.map((collection, index) => ({
    navItemId: collectionsNav._id,
    collectionId: collection._id,
    sortOrder: index,
    isVisible: true
  })));
};

let defaultsPromise: Promise<void> | null = null;

const ensureDefaultsUnlocked = async (): Promise<void> => {
  await seedSiteSettings();
  await seedCategories();
  await seedCollections();
  await seedNavigation();
  await seedMenuCardsAndPromos();
  await Promise.all([seedTags(), seedPageSettings()]);
};

const ensureDefaults = async (): Promise<void> => {
  defaultsPromise ??= ensureDefaultsUnlocked().finally(() => {
    defaultsPromise = null;
  });
  await defaultsPromise;
};

const visibleQuery = (admin: boolean): Record<string, unknown> => admin ? {} : { isVisible: true };
const publishedVisibleQuery = (admin: boolean): Record<string, unknown> => admin ? {} : { isVisible: true, isPublished: { $ne: false } };
const publicProductMatch = { isActive: true, isArchived: { $ne: true }, visibility: 'visible', status: 'published' } as const;
const pageQuery = (filters: { pageType?: string; pageSlug?: string }): Record<string, unknown> => ({
  ...(filters.pageType ? { pageType: filters.pageType } : {}),
  ...(filters.pageSlug ? { pageSlug: filters.pageSlug } : {})
});

export const MerchandisingService = {
  ensureDefaults,

  async navigation(admin = false): Promise<unknown[]> {
    if (!admin) {
      const settings = await SiteSettingsModel.findOne({ singletonKey: 'global' }).select('isStorefrontNavigationVisible').lean();
      if (settings?.isStorefrontNavigationVisible === false) return [];
    }
    const navItems = await NavigationItemModel.find(visibleQuery(admin)).sort({ sortOrder: 1, createdAt: 1 }).lean();
    const navIds = navItems.map((item) => item._id);
    const columns = await MegaMenuColumnModel.find({ navItemId: { $in: navIds }, ...visibleQuery(admin) }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    const columnIds = columns.map((column) => column._id);
    const links = await MegaMenuLinkModel.find({ columnId: { $in: columnIds }, ...visibleQuery(admin) }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    const collectionCardQuery = MegaMenuCollectionCardModel.find({ navItemId: { $in: navIds }, ...visibleQuery(admin) }).sort({ sortOrder: 1, createdAt: 1 });
    if (admin) {
      collectionCardQuery.populate('collectionId');
    } else {
      collectionCardQuery.populate({ path: 'collectionId', match: publishedVisibleQuery(false) });
    }
    const [collectionCards, promos] = await Promise.all([
      collectionCardQuery.lean(),
      MegaMenuPromoModel.find({ navItemId: { $in: navIds }, ...visibleQuery(admin) }).lean()
    ]);
    return navItems.map((item) => ({
      ...item,
      columns: columns
        .filter((column) => String(column.navItemId) === String(item._id))
        .map((column) => ({ ...column, links: links.filter((link) => String(link.columnId) === String(column._id)) })),
      collectionCards: collectionCards.filter((card) => {
        if (String(card.navItemId) !== String(item._id)) return false;
        if (admin || card.collectionId) return true;
        return Boolean(card.slugOverride || card.titleOverride || card.imageOverride);
      }),
      promo: promos.find((promo) => String(promo.navItemId) === String(item._id)) ?? null
    }));
  },

  async createNavigationItem(input: MerchandisingInput): Promise<unknown> {
    return NavigationItemModel.create(input);
  },

  async updateNavigationItem(id: string, input: MerchandisingInput): Promise<unknown> {
    const item = await NavigationItemModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!item) throw new ApiError(404, 'Navigation item not found');
    return item;
  },

  async removeNavigationItem(id: string): Promise<void> {
    const item = await NavigationItemModel.findByIdAndDelete(id);
    if (!item) throw new ApiError(404, 'Navigation item not found');
    const columns = await MegaMenuColumnModel.find({ navItemId: id }).select('_id').lean();
    await MegaMenuLinkModel.deleteMany({ columnId: { $in: columns.map((column) => column._id) } });
    await MegaMenuColumnModel.deleteMany({ navItemId: id });
    await MegaMenuCollectionCardModel.deleteMany({ navItemId: id });
    await MegaMenuPromoModel.deleteMany({ navItemId: id });
  },

  async reorderNavigationItems(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id, index) => NavigationItemModel.findByIdAndUpdate(id, { sortOrder: index })));
  },

  async columns(navItemId?: string): Promise<unknown[]> {
    return MegaMenuColumnModel.find(navItemId ? { navItemId } : {}).sort({ navItemId: 1, sortOrder: 1 }).lean();
  },

  async createColumn(input: MerchandisingInput): Promise<unknown> {
    return MegaMenuColumnModel.create(input);
  },

  async updateColumn(id: string, input: MerchandisingInput): Promise<unknown> {
    const column = await MegaMenuColumnModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!column) throw new ApiError(404, 'Mega menu column not found');
    return column;
  },

  async removeColumn(id: string): Promise<void> {
    const column = await MegaMenuColumnModel.findByIdAndDelete(id);
    if (!column) throw new ApiError(404, 'Mega menu column not found');
    await MegaMenuLinkModel.deleteMany({ columnId: id });
  },

  async links(columnId?: string): Promise<unknown[]> {
    return MegaMenuLinkModel.find(columnId ? { columnId } : {}).sort({ columnId: 1, sortOrder: 1 }).lean();
  },

  async createLink(input: MerchandisingInput): Promise<unknown> {
    return MegaMenuLinkModel.create(input);
  },

  async updateLink(id: string, input: MerchandisingInput): Promise<unknown> {
    const link = await MegaMenuLinkModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!link) throw new ApiError(404, 'Mega menu link not found');
    return link;
  },

  async removeLink(id: string): Promise<void> {
    const link = await MegaMenuLinkModel.findByIdAndDelete(id);
    if (!link) throw new ApiError(404, 'Mega menu link not found');
  },

  async collectionCards(navItemId?: string): Promise<unknown[]> {
    return MegaMenuCollectionCardModel.find(navItemId ? { navItemId } : {}).populate('collectionId').sort({ navItemId: 1, sortOrder: 1 }).lean();
  },

  async createCollectionCard(input: MerchandisingInput): Promise<unknown> {
    return MegaMenuCollectionCardModel.create(input);
  },

  async updateCollectionCard(id: string, input: MerchandisingInput): Promise<unknown> {
    const card = await MegaMenuCollectionCardModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!card) throw new ApiError(404, 'Mega menu collection card not found');
    return card;
  },

  async removeCollectionCard(id: string): Promise<void> {
    const card = await MegaMenuCollectionCardModel.findByIdAndDelete(id);
    if (!card) throw new ApiError(404, 'Mega menu collection card not found');
  },

  async promos(navItemId?: string): Promise<unknown[]> {
    return MegaMenuPromoModel.find(navItemId ? { navItemId } : {}).sort({ navItemId: 1, createdAt: 1 }).lean();
  },

  async upsertPromo(input: MerchandisingInput): Promise<unknown> {
    const navItemId = String(input.navItemId ?? '');
    return MegaMenuPromoModel.findOneAndUpdate({ navItemId }, input, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  },

  async updatePromo(id: string, input: MerchandisingInput): Promise<unknown> {
    const promo = await MegaMenuPromoModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!promo) throw new ApiError(404, 'Mega menu promo not found');
    return promo;
  },

  async removePromo(id: string): Promise<void> {
    const promo = await MegaMenuPromoModel.findByIdAndDelete(id);
    if (!promo) throw new ApiError(404, 'Mega menu promo not found');
  },

  async collections(admin = false): Promise<unknown[]> {
    return CollectionModel.find(publishedVisibleQuery(admin)).sort({ sortOrder: 1, createdAt: 1 }).lean();
  },

  async collectionBySlug(slug: string, admin = false): Promise<unknown> {
    const query = CollectionModel.findOne({ slug: slug.toLowerCase(), ...publishedVisibleQuery(admin) });
    if (admin) {
      query.populate('productIds').populate('categoryIds');
    } else {
      query
        .populate({ path: 'productIds', match: publicProductMatch })
        .populate({ path: 'categoryIds', match: { isActive: true, isVisible: { $ne: false }, isPublished: { $ne: false } } });
    }
    const collection = await query.lean();
    if (!collection) throw new ApiError(404, 'Collection not found');
    return collection;
  },

  async createCollection(input: MerchandisingInput): Promise<unknown> {
    const collection = await CollectionModel.create(input);
    markCatalogueStale();
    return collection;
  },

  async updateCollection(id: string, input: MerchandisingInput): Promise<unknown> {
    const collection = await CollectionModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!collection) throw new ApiError(404, 'Collection not found');
    markCatalogueStale();
    return collection;
  },

  async removeCollection(id: string): Promise<void> {
    const collection = await CollectionModel.findByIdAndUpdate(id, { isVisible: false }, { new: true });
    if (!collection) throw new ApiError(404, 'Collection not found');
    markCatalogueStale();
  },

  async pageSettings(filters: { pageType?: string; pageSlug?: string; page?: number; limit?: number }): Promise<PaginatedResult<unknown>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;
    const query = pageQuery(filters);
    const [items, total] = await Promise.all([
      PageSettingsModel.find(query).sort({ pageType: 1, pageSlug: 1 }).skip(skip).limit(limit).lean(),
      PageSettingsModel.countDocuments(query)
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async pageSetting(pageType: string, pageSlug = 'index'): Promise<unknown> {
    const setting = await PageSettingsModel.findOne({ pageType, pageSlug: pageSlug.toLowerCase(), isPublished: true }).lean();
    return setting ?? null;
  },

  async upsertPageSettings(input: MerchandisingInput): Promise<unknown> {
    const pageType = String(input.pageType ?? '');
    const pageSlug = String(input.pageSlug ?? 'index').toLowerCase();
    return PageSettingsModel.findOneAndUpdate({ pageType, pageSlug }, input, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  },

  async updatePageSettings(id: string, input: MerchandisingInput): Promise<unknown> {
    const settings = await PageSettingsModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!settings) throw new ApiError(404, 'Page settings not found');
    return settings;
  },

  async siteSettings(): Promise<unknown> {
    return SiteSettingsModel.findOne({ singletonKey: 'global' }).lean();
  },

  async updateSiteSettings(input: MerchandisingInput): Promise<unknown> {
    return SiteSettingsModel.findOneAndUpdate({ singletonKey: 'global' }, { ...input, singletonKey: 'global' }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  },

  async tags(admin = false): Promise<unknown[]> {
    return TagModel.find(visibleQuery(admin)).sort({ sortOrder: 1, name: 1 }).lean();
  },

  async createTag(input: MerchandisingInput): Promise<unknown> {
    return TagModel.create(input);
  },

  async updateTag(id: string, input: MerchandisingInput): Promise<unknown> {
    const tag = await TagModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!tag) throw new ApiError(404, 'Tag not found');
    return tag;
  },

  async removeTag(id: string): Promise<void> {
    const tag = await TagModel.findByIdAndUpdate(id, { isVisible: false }, { new: true });
    if (!tag) throw new ApiError(404, 'Tag not found');
  }
};
