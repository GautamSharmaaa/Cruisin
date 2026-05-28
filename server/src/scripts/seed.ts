// Governed by .rules v1.0
import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { redis } from '../config/redis.js';
import { BannerModel } from '../models/banner.model.js';
import { CategoryModel } from '../models/category.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { ProductModel } from '../models/product.model.js';
import { ReviewModel } from '../models/review.model.js';
import { UserModel } from '../models/user.model.js';
import { logger } from '../utils/logger.js';

const imageBase = 'https://images.unsplash.com';

const seed = async (): Promise<void> => {
  await connectDb();

  const passwordHash = await bcrypt.hash('CruisinAdmin123', 12);
  const admin = await UserModel.findOneAndUpdate(
    { email: 'admin@cruisin.local' },
    { name: 'Cruisin Admin', email: 'admin@cruisin.local', passwordHash, role: 'superadmin', isVerified: true, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const categories = await Promise.all([
    CategoryModel.findOneAndUpdate(
      { slug: 'outerwear' },
      { name: 'Outerwear', slug: 'outerwear', image: imageBase + '/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85', sortOrder: 0, breadcrumb: [{ name: 'Outerwear', slug: 'outerwear' }] },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    CategoryModel.findOneAndUpdate(
      { slug: 'tops' },
      { name: 'Tops', slug: 'tops', image: imageBase + '/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85', sortOrder: 1, breadcrumb: [{ name: 'Tops', slug: 'tops' }] },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    CategoryModel.findOneAndUpdate(
      { slug: 'bottoms' },
      { name: 'Bottoms', slug: 'bottoms', image: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85', sortOrder: 2, breadcrumb: [{ name: 'Bottoms', slug: 'bottoms' }] },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  ]);

  const [outerwear, tops, bottoms] = categories;

  const productPayloads = [
    {
      title: 'Void Drape Hoodie',
      slug: 'void-drape-hoodie',
      description: 'Heavyweight cotton fleece with a lowered shoulder and architectural hood.',
      richDescription: 'Cut oversized with dense brushed cotton, hidden side pockets, and a matte black drawcord system.',
      category: tops._id,
      image: imageBase + '/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
      basePrice: 18900,
      comparePrice: 22900,
      variants: [
        { size: 'S', color: 'Black', colorHex: '#080808', sku: 'CR-VDH-BLK-S', price: 18900, stock: 4 },
        { size: 'M', color: 'Black', colorHex: '#080808', sku: 'CR-VDH-BLK-M', price: 18900, stock: 0 }
      ],
      tags: ['new', 'editorial'],
      isFeatured: true
    },
    {
      title: 'Signal Cargo Trouser',
      slug: 'signal-cargo-trouser',
      description: 'Wide cargo trouser with concealed hardware and fluid stacked break.',
      richDescription: 'A streetwear trouser built from compact twill with adjustable tabs and deep utility pockets.',
      category: bottoms._id,
      image: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85',
      basePrice: 16400,
      variants: [{ size: '30', color: 'Carbon', colorHex: '#1a1a1a', sku: 'CR-SCT-CBN-30', price: 16400, stock: 8 }],
      tags: ['best'],
      isFeatured: true
    },
    {
      title: 'Monolith Overshirt',
      slug: 'monolith-overshirt',
      description: 'Structured overshirt with a precise box fit and hidden placket.',
      richDescription: 'A transitional outer layer with wool-touch texture, squared hem, and internal pocketing.',
      category: outerwear._id,
      image: imageBase + '/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85',
      basePrice: 21400,
      variants: [{ size: 'M', color: 'Obsidian', colorHex: '#0f0f0f', sku: 'CR-MO-OBS-M', price: 21400, stock: 6 }],
      tags: ['new'],
      isFeatured: true
    }
  ];

  const products = await Promise.all(productPayloads.map((product) => ProductModel.findOneAndUpdate(
    { slug: product.slug },
    {
      title: product.title,
      slug: product.slug,
      description: product.description,
      richDescription: product.richDescription,
      brand: 'Cruisin',
      category: product.category,
      images: [{ url: product.image, alt: product.title, width: 1200, height: 1600 }],
      basePrice: product.basePrice,
      comparePrice: product.comparePrice,
      variants: product.variants.map((variant) => ({ ...variant, images: [{ url: product.image, alt: product.title, width: 1200, height: 1600 }] })),
      tags: product.tags,
      isFeatured: product.isFeatured,
      isActive: true,
      ratings: { avg: 4.8, count: 12 },
      seo: { metaTitle: product.title, metaDesc: product.description, ogImage: product.image }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));

  await CouponModel.findOneAndUpdate(
    { code: 'PRIVATE10' },
    { code: 'PRIVATE10', type: 'percentage', value: 10, minOrderValue: 10000, maxDiscount: 5000, usageLimit: 500, userUsageLimit: 1, applicableProducts: [], applicableCategories: [], isActive: true, validFrom: new Date('2026-01-01'), validUntil: new Date('2027-01-01') },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await BannerModel.findOneAndUpdate(
    { position: 'home-hero' },
    { title: 'Wear Less. Mean More.', subtitle: 'Drop 04 / Black Transit', cta: { text: 'Enter The Drop', link: '/shop' }, image: imageBase + '/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1800&q=85', mobileImage: imageBase + '/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85', position: 'home-hero', isActive: true, startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'), sortOrder: 0 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await ReviewModel.findOneAndUpdate(
    { product: products[0]._id, user: admin._id },
    { product: products[0]._id, user: admin._id, rating: 5, title: 'Insane fabric', body: 'Dense, quiet, and tailored in the right places.', isVerifiedPurchase: true, status: 'approved' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logger.info('Seed complete', { admin: admin.email, products: products.length });
  await redis.quit();
};

void seed().then(() => process.exit(0)).catch((error: unknown) => {
  logger.error('Seed failed', { error });
  process.exit(1);
});
