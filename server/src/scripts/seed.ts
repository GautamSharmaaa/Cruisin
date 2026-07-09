// Governed by .rules v1.0
import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { redis } from '../config/redis.js';
import { BannerModel } from '../models/banner.model.js';
import { CategoryModel } from '../models/category.model.js';
import { CollectionModel } from '../models/collection.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { ProductModel } from '../models/product.model.js';
import { ReviewModel } from '../models/review.model.js';
import { UserModel } from '../models/user.model.js';
import { MerchandisingService } from '../services/merchandising.service.js';
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
      { name: 'Outerwear', slug: 'outerwear', image: imageBase + '/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85', sortOrder: 0, breadcrumb: [{ name: 'Outerwear', slug: 'outerwear' }], isActive: true, isVisible: true, isPublished: true, showInMenu: true, showInFilters: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    CategoryModel.findOneAndUpdate(
      { slug: 'tops' },
      { name: 'Tops', slug: 'tops', image: imageBase + '/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85', sortOrder: 1, breadcrumb: [{ name: 'Tops', slug: 'tops' }], isActive: true, isVisible: true, isPublished: true, showInMenu: true, showInFilters: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    CategoryModel.findOneAndUpdate(
      { slug: 'bottoms' },
      { name: 'Bottoms', slug: 'bottoms', image: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85', sortOrder: 2, breadcrumb: [{ name: 'Bottoms', slug: 'bottoms' }], isActive: true, isVisible: true, isPublished: true, showInMenu: true, showInFilters: true },
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
        { size: 'M', color: 'Black', colorHex: '#080808', sku: 'CR-VDH-BLK-M', price: 18900, stock: 12 },
        { size: 'L', color: 'Black', colorHex: '#080808', sku: 'CR-VDH-BLK-L', price: 18900, stock: 8 },
        { size: 'XL', color: 'Black', colorHex: '#080808', sku: 'CR-VDH-BLK-XL', price: 18900, stock: 5 }
      ],
      tags: ['new', 'editorial'],
      isFeatured: true,
      ratings: { avg: 4.8, count: 12 }
    },
    {
      title: 'Minimalist Heavyweight Tee',
      slug: 'minimalist-heavyweight-tee',
      description: 'Preshrunk combed cotton tee with a thick rib collar and relaxed drop-shoulder drape.',
      richDescription: 'Crafted from 240GSM cotton, this tee offers a structured silhouette that stands up to daily wear while remaining incredibly soft.',
      category: tops._id,
      image: imageBase + '/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
      basePrice: 8900,
      comparePrice: 10900,
      variants: [
        { size: 'XS', color: 'Off-White', colorHex: '#f5f5f5', sku: 'CR-MHT-WHT-XS', price: 8900, stock: 6 },
        { size: 'S', color: 'Off-White', colorHex: '#f5f5f5', sku: 'CR-MHT-WHT-S', price: 8900, stock: 15 },
        { size: 'M', color: 'Off-White', colorHex: '#f5f5f5', sku: 'CR-MHT-WHT-M', price: 8900, stock: 20 },
        { size: 'L', color: 'Off-White', colorHex: '#f5f5f5', sku: 'CR-MHT-WHT-L', price: 8900, stock: 10 },
        { size: 'XL', color: 'Off-White', colorHex: '#f5f5f5', sku: 'CR-MHT-WHT-XL', price: 8900, stock: 12 }
      ],
      tags: ['new'],
      isFeatured: true,
      ratings: { avg: 4.5, count: 8 }
    },
    {
      title: 'Signal Cargo Trouser',
      slug: 'signal-cargo-trouser',
      description: 'Wide cargo trouser with concealed hardware and fluid stacked break.',
      richDescription: 'A streetwear trouser built from compact twill with adjustable tabs and deep utility pockets.',
      category: bottoms._id,
      image: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85',
      basePrice: 16400,
      variants: [
        { size: '30', color: 'Carbon', colorHex: '#1a1a1a', sku: 'CR-SCT-CBN-30', price: 16400, stock: 8 },
        { size: '32', color: 'Carbon', colorHex: '#1a1a1a', sku: 'CR-SCT-CBN-32', price: 16400, stock: 14 },
        { size: '34', color: 'Carbon', colorHex: '#1a1a1a', sku: 'CR-SCT-CBN-34', price: 16400, stock: 9 }
      ],
      tags: ['best'],
      isFeatured: true,
      ratings: { avg: 4.2, count: 5 }
    },
    {
      title: 'Apex Utility Jogger',
      slug: 'apex-utility-jogger',
      description: 'Relaxed fit fleece jogger with zip pockets and adjustable toggle hems.',
      richDescription: 'Heavyweight loopback cotton construction, featuring dynamic seam panels, matte black waterproof zippers, and custom drawcords.',
      category: bottoms._id,
      image: imageBase + '/photo-1551854838-212c50b4c184?auto=format&fit=crop&w=1200&q=85',
      basePrice: 14500,
      variants: [
        { size: 'S', color: 'Obsidian Black', colorHex: '#121212', sku: 'CR-AUJ-BLK-S', price: 14500, stock: 6 },
        { size: 'M', color: 'Obsidian Black', colorHex: '#121212', sku: 'CR-AUJ-BLK-M', price: 14500, stock: 12 },
        { size: 'L', color: 'Obsidian Black', colorHex: '#121212', sku: 'CR-AUJ-BLK-L', price: 14500, stock: 8 },
        { size: 'XL', color: 'Obsidian Black', colorHex: '#121212', sku: 'CR-AUJ-BLK-XL', price: 14500, stock: 10 }
      ],
      tags: ['best'],
      isFeatured: true,
      ratings: { avg: 4.7, count: 19 }
    },
    {
      title: 'Transit Tech Shorts',
      slug: 'transit-tech-shorts',
      description: 'Water-resistant nylon shorts with an integrated belt and utility cargo slots.',
      richDescription: 'Designed for high mobility, using premium micro-ripstop nylon, matte hardware, and mesh pocket bags.',
      category: bottoms._id,
      image: imageBase + '/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1200&q=85',
      basePrice: 11000,
      comparePrice: 13000,
      variants: [
        { size: 'S', color: 'Carbon Grey', colorHex: '#3a3a3a', sku: 'CR-TTS-GRY-S', price: 11000, stock: 7 },
        { size: 'M', color: 'Carbon Grey', colorHex: '#3a3a3a', sku: 'CR-TTS-GRY-M', price: 11000, stock: 14 },
        { size: 'L', color: 'Carbon Grey', colorHex: '#3a3a3a', sku: 'CR-TTS-GRY-L', price: 11000, stock: 11 },
        { size: 'XL', color: 'Carbon Grey', colorHex: '#3a3a3a', sku: 'CR-TTS-GRY-XL', price: 11000, stock: 5 }
      ],
      tags: ['new'],
      isFeatured: false,
      ratings: { avg: 4.1, count: 3 }
    },
    {
      title: 'Monolith Overshirt',
      slug: 'monolith-overshirt',
      description: 'Structured overshirt with a precise box fit and hidden placket.',
      richDescription: 'A transitional outer layer with wool-touch texture, squared hem, and internal pocketing.',
      category: outerwear._id,
      image: imageBase + '/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85',
      basePrice: 21400,
      variants: [
        { size: 'S', color: 'Obsidian', colorHex: '#0f0f0f', sku: 'CR-MO-OBS-S', price: 21400, stock: 4 },
        { size: 'M', color: 'Obsidian', colorHex: '#0f0f0f', sku: 'CR-MO-OBS-M', price: 21400, stock: 6 },
        { size: 'L', color: 'Obsidian', colorHex: '#0f0f0f', sku: 'CR-MO-OBS-L', price: 21400, stock: 8 },
        { size: 'XL', color: 'Obsidian', colorHex: '#0f0f0f', sku: 'CR-MO-OBS-XL', price: 21400, stock: 3 }
      ],
      tags: ['new'],
      isFeatured: true,
      ratings: { avg: 4.9, count: 22 }
    },
    {
      title: 'Phantom Windbreaker',
      slug: 'phantom-windbreaker',
      description: 'Ultra-light water-repellent shell jacket with modular hood and ventilation panels.',
      richDescription: 'Built from breathable technical nylon, it contains internal shoulder straps for hands-free carry, seam sealing, and reflective screen prints.',
      category: outerwear._id,
      image: imageBase + '/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1200&q=85',
      basePrice: 24500,
      comparePrice: 28500,
      variants: [
        { size: 'XS', color: 'Charcoal', colorHex: '#2b2b2b', sku: 'CR-PWB-CHA-XS', price: 24500, stock: 4 },
        { size: 'S', color: 'Charcoal', colorHex: '#2b2b2b', sku: 'CR-PWB-CHA-S', price: 24500, stock: 10 },
        { size: 'M', color: 'Charcoal', colorHex: '#2b2b2b', sku: 'CR-PWB-CHA-M', price: 24500, stock: 15 },
        { size: 'L', color: 'Charcoal', colorHex: '#2b2b2b', sku: 'CR-PWB-CHA-L', price: 24500, stock: 8 },
        { size: 'XL', color: 'Charcoal', colorHex: '#2b2b2b', sku: 'CR-PWB-CHA-XL', price: 24500, stock: 6 }
      ],
      tags: ['best', 'editorial'],
      isFeatured: true,
      ratings: { avg: 4.9, count: 31 }
    },
    {
      title: 'Core Sweatpants',
      slug: 'core-sweatpants',
      description: 'Tapered fit heavy cotton sweatpants with subtle logo embroidery.',
      richDescription: 'Constructed from loopback French terry cotton with deep zippered side pockets and an elastic drawstring waist.',
      category: bottoms._id,
      image: imageBase + '/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
      basePrice: 12500,
      variants: [
        { size: 'XS', color: 'Heather Grey', colorHex: '#b0b0b0', sku: 'CR-CSP-GRY-XS', price: 12500, stock: 8 },
        { size: 'S', color: 'Heather Grey', colorHex: '#b0b0b0', sku: 'CR-CSP-GRY-S', price: 12500, stock: 14 },
        { size: 'M', color: 'Heather Grey', colorHex: '#b0b0b0', sku: 'CR-CSP-GRY-M', price: 12500, stock: 22 },
        { size: 'L', color: 'Heather Grey', colorHex: '#b0b0b0', sku: 'CR-CSP-GRY-L', price: 12500, stock: 19 },
        { size: 'XL', color: 'Heather Grey', colorHex: '#b0b0b0', sku: 'CR-CSP-GRY-XL', price: 12500, stock: 11 }
      ],
      tags: ['essential'],
      isFeatured: false,
      ratings: { avg: 4.3, count: 14 }
    },
    {
      title: 'Cyber Punk Parka',
      slug: 'cyber-punk-parka',
      description: 'Longline technical fishtail parka with weather protection membranes.',
      richDescription: 'Fully waterproof laminate exterior, internal harness system, magnetic-closure cargo compartments, and storm collar construction.',
      category: outerwear._id,
      image: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85',
      basePrice: 32000,
      comparePrice: 38000,
      variants: [
        { size: 'S', color: 'Obsidian Black', colorHex: '#080808', sku: 'CR-CPP-BLK-S', price: 32000, stock: 3 },
        { size: 'M', color: 'Obsidian Black', colorHex: '#080808', sku: 'CR-CPP-BLK-M', price: 32000, stock: 5 },
        { size: 'L', color: 'Obsidian Black', colorHex: '#080808', sku: 'CR-CPP-BLK-L', price: 32000, stock: 3 },
        { size: 'XL', color: 'Obsidian Black', colorHex: '#080808', sku: 'CR-CPP-BLK-XL', price: 32000, stock: 4 }
      ],
      tags: ['editorial'],
      isFeatured: true,
      ratings: { avg: 5.0, count: 7 }
    },
    {
      title: 'Aero Graphic Tee',
      slug: 'aero-graphic-tee',
      description: 'Drop shoulder cotton jersey tee featuring clean typographic graphics.',
      richDescription: 'Soft-touch water-based printing on custom knit luxury cotton jersey with distressed detail at the collar.',
      category: tops._id,
      image: imageBase + '/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
      basePrice: 7500,
      variants: [
        { size: 'XS', color: 'White', colorHex: '#ffffff', sku: 'CR-AGT-WHT-XS', price: 7500, stock: 12 },
        { size: 'S', color: 'White', colorHex: '#ffffff', sku: 'CR-AGT-WHT-S', price: 7500, stock: 30 },
        { size: 'M', color: 'White', colorHex: '#ffffff', sku: 'CR-AGT-WHT-M', price: 7500, stock: 25 },
        { size: 'L', color: 'White', colorHex: '#ffffff', sku: 'CR-AGT-WHT-L', price: 7500, stock: 15 },
        { size: 'XL', color: 'White', colorHex: '#ffffff', sku: 'CR-AGT-WHT-XL', price: 7500, stock: 20 }
      ],
      tags: ['new'],
      isFeatured: false,
      ratings: { avg: 4.0, count: 6 }
    },
    {
      title: 'Grid Linen Shirt',
      slug: 'grid-linen-shirt',
      description: 'Linen-cotton blend button down shirt with dynamic grid pattern weave.',
      richDescription: 'Breathable utility shirt with flap chest pockets, buttoned cuffs, and comfortable regular silhouette.',
      category: tops._id,
      image: imageBase + '/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85',
      basePrice: 13500,
      variants: [
        { size: 'S', color: 'Sand', colorHex: '#e1d7c6', sku: 'CR-GLS-SND-S', price: 13500, stock: 8 },
        { size: 'M', color: 'Sand', colorHex: '#e1d7c6', sku: 'CR-GLS-SND-M', price: 13500, stock: 12 },
        { size: 'L', color: 'Sand', colorHex: '#e1d7c6', sku: 'CR-GLS-SND-L', price: 13500, stock: 10 },
        { size: 'XL', color: 'Sand', colorHex: '#e1d7c6', sku: 'CR-GLS-SND-XL', price: 13500, stock: 5 }
      ],
      tags: ['essential'],
      isFeatured: false,
      ratings: { avg: 4.6, count: 11 }
    },
    {
      title: 'Oversized Knit Cardigan',
      slug: 'oversized-knit-cardigan',
      description: 'Chunky wool-blend knit cardigan with natural horn buttons and relaxed drape.',
      richDescription: 'Knitted from a soft alpaca-wool blend with a textured rib pattern, dropped shoulders, and patch pockets for an effortless layering silhouette.',
      category: outerwear._id,
      image: imageBase + '/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=85',
      images: [
        { url: imageBase + '/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Oatmeal Front', width: 1200, height: 1600 },
        { url: imageBase + '/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Detail View', width: 1200, height: 1600 },
        { url: imageBase + '/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Oatmeal Wearing Style', width: 1200, height: 1600 }
      ],
      basePrice: 28900,
      variants: [
        {
          size: 'S',
          color: 'Oatmeal',
          colorHex: '#dfd5c6',
          sku: 'CR-OKC-OAT-S',
          price: 28900,
          stock: 8,
          images: [
            { url: imageBase + '/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Oatmeal Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Oatmeal Style', width: 1200, height: 1600 }
          ]
        },
        {
          size: 'M',
          color: 'Oatmeal',
          colorHex: '#dfd5c6',
          sku: 'CR-OKC-OAT-M',
          price: 28900,
          stock: 12,
          images: [
            { url: imageBase + '/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Oatmeal Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Oatmeal Style', width: 1200, height: 1600 }
          ]
        },
        {
          size: 'L',
          color: 'Oatmeal',
          colorHex: '#dfd5c6',
          sku: 'CR-OKC-OAT-L',
          price: 28900,
          stock: 6,
          images: [
            { url: imageBase + '/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Oatmeal Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Oatmeal Style', width: 1200, height: 1600 }
          ]
        },
        {
          size: 'S',
          color: 'Espresso',
          colorHex: '#3d2b1f',
          sku: 'CR-OKC-ESP-S',
          price: 28900,
          stock: 5,
          images: [
            { url: imageBase + '/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Espresso Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Espresso Style', width: 1200, height: 1600 }
          ]
        },
        {
          size: 'M',
          color: 'Espresso',
          colorHex: '#3d2b1f',
          sku: 'CR-OKC-ESP-M',
          price: 28900,
          stock: 9,
          images: [
            { url: imageBase + '/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Espresso Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1200&q=85', alt: 'Oversized Knit Cardigan - Espresso Style', width: 1200, height: 1600 }
          ]
        }
      ],
      tags: ['new', 'editorial'],
      isFeatured: true,
      ratings: { avg: 4.8, count: 14 }
    },
    {
      title: 'Cyber Cargo Pants',
      slug: 'cyber-cargo-pants',
      description: 'Multi-pocket technical cargo trousers with water-repellent finish.',
      richDescription: 'Engineered pants with articulated knees, modular strap systems, secure zip-lock compartments, and adjustable toggle ankles.',
      category: bottoms._id,
      image: imageBase + '/photo-1517462964-21fdcec3f25b?auto=format&fit=crop&w=1200&q=85',
      images: [
        { url: imageBase + '/photo-1517462964-21fdcec3f25b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Sage Green Front', width: 1200, height: 1600 },
        { url: imageBase + '/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Stealth Black Detail', width: 1200, height: 1600 },
        { url: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Full Model Look', width: 1200, height: 1600 }
      ],
      basePrice: 19500,
      variants: [
        {
          size: '30',
          color: 'Sage Green',
          colorHex: '#708238',
          sku: 'CR-CCP-SAG-30',
          price: 19500,
          stock: 10,
          images: [
            { url: imageBase + '/photo-1517462964-21fdcec3f25b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Sage Green Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Sage Green Style', width: 1200, height: 1600 }
          ]
        },
        {
          size: '32',
          color: 'Sage Green',
          colorHex: '#708238',
          sku: 'CR-CCP-SAG-32',
          price: 19500,
          stock: 15,
          images: [
            { url: imageBase + '/photo-1517462964-21fdcec3f25b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Sage Green Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Sage Green Style', width: 1200, height: 1600 }
          ]
        },
        {
          size: '34',
          color: 'Sage Green',
          colorHex: '#708238',
          sku: 'CR-CCP-SAG-34',
          price: 19500,
          stock: 8,
          images: [
            { url: imageBase + '/photo-1517462964-21fdcec3f25b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Sage Green Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Sage Green Style', width: 1200, height: 1600 }
          ]
        },
        {
          size: '30',
          color: 'Stealth Black',
          colorHex: '#0c0c0c',
          sku: 'CR-CCP-STB-30',
          price: 19500,
          stock: 12,
          images: [
            { url: imageBase + '/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Stealth Black Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Stealth Black Style', width: 1200, height: 1600 }
          ]
        },
        {
          size: '32',
          color: 'Stealth Black',
          colorHex: '#0c0c0c',
          sku: 'CR-CCP-STB-32',
          price: 19500,
          stock: 18,
          images: [
            { url: imageBase + '/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Stealth Black Front', width: 1200, height: 1600 },
            { url: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85', alt: 'Cyber Cargo Pants - Stealth Black Style', width: 1200, height: 1600 }
          ]
        }
      ],
      tags: ['best'],
      isFeatured: true,
      ratings: { avg: 4.9, count: 28 }
    }
  ];

  const seedSlugs = productPayloads.map((product) => product.slug);
  const seedSkus = productPayloads.flatMap((product) => product.variants.map((variant) => variant.sku));
  await ProductModel.deleteMany({ isArchived: true, slug: { $nin: seedSlugs }, 'variants.sku': { $in: seedSkus } });

  const products = await Promise.all(productPayloads.map((product) => {
    const images = product.images ?? [{ url: product.image, alt: product.title, width: 1200, height: 1600 }];
    return ProductModel.findOneAndUpdate(
      { slug: product.slug },
      {
        title: product.title,
        slug: product.slug,
        description: product.description,
        richDescription: product.richDescription,
        brand: 'Cruisin',
        category: product.category,
        images,
        basePrice: product.basePrice,
        comparePrice: product.comparePrice,
        variants: product.variants.map((variant) => ({ ...variant, images: 'images' in variant ? variant.images : images })),
        tags: product.tags,
        isFeatured: product.isFeatured,
        isActive: true,
        isArchived: false,
        status: 'published',
        visibility: 'visible',
        ratings: product.ratings,
        seo: { metaTitle: product.title, metaDesc: product.description, ogImage: product.image }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }));

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

  await MerchandisingService.ensureDefaults();

  const categoryByPath = new Map((await CategoryModel.find({ path: { $exists: true } }).select('_id path').lean()).map((category) => [String(category.path), category._id]));
  const collectionBySlug = new Map((await CollectionModel.find().select('_id slug').lean()).map((collection) => [String(collection.slug), collection._id]));
  const categoryPathsForProduct = (title: string): string[] => {
    const lower = title.toLowerCase();
    const paths = ['men', 'women'];
    if (lower.includes('hoodie')) paths.push('men/hoodies', 'women/hoodies');
    else if (lower.includes('tee')) paths.push('men/t-shirts', 'women/t-shirts');
    else if (lower.includes('shirt')) paths.push('men/shirts');
    else if (lower.includes('jogger')) paths.push('men/joggers', 'women/joggers');
    else if (lower.includes('cargo')) paths.push('men/cargo-pants', 'men/pants');
    else if (lower.includes('trouser') || lower.includes('pants') || lower.includes('shorts')) paths.push('men/pants', 'women/pants-leggings');
    else if (lower.includes('parka') || lower.includes('windbreaker') || lower.includes('overshirt') || lower.includes('cardigan')) paths.push('men/jackets', 'women/jackets');
    return paths;
  };
  const collectionSlugsForProduct = (index: number, product: { comparePrice?: number; tags?: string[] }): string[] => {
    const slugs = index < 4 ? ['black-transit'] : index < 8 ? ['quiet-uniform'] : ['latest-drop'];
    if (product.comparePrice) slugs.push('racing-club');
    if (product.tags?.includes('editorial')) slugs.push('winter-collection');
    return Array.from(new Set(slugs));
  };
  await Promise.all(products.map(async (product, index) => {
    const payload = productPayloads[index];
    const categoryIds = categoryPathsForProduct(product.title).flatMap((path) => {
      const id = categoryByPath.get(path);
      return id ? [id] : [];
    });
    const collectionSlugs = collectionSlugsForProduct(index, payload);
    const collections = collectionSlugs.flatMap((slug) => {
      const id = collectionBySlug.get(slug);
      return id ? [id] : [];
    });
    await ProductModel.findByIdAndUpdate(product._id, {
      categoryIds: Array.from(new Set([product.category, ...categoryIds].map(String))),
      collections,
      collectionSlugs,
      gender: 'unisex',
      isSale: Boolean(product.comparePrice),
      isLatestDrop: product.tags.includes('new'),
      isBestseller: product.tags.includes('best')
    });
  }));
  await Promise.all(Array.from(collectionBySlug.entries()).map(([slug, collectionId]) => {
    const matching = products.filter((_product, index) => collectionSlugsForProduct(index, productPayloads[index]).includes(slug)).map((product) => product._id);
    return CollectionModel.findByIdAndUpdate(collectionId, { productIds: matching });
  }));

  logger.info('Seed complete', { admin: admin.email, products: products.length });
  await redis.quit();
};

void seed().then(() => process.exit(0)).catch((error: unknown) => {
  logger.error('Seed failed', { error });
  process.exit(1);
});
