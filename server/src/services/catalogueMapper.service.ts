// Governed by .rules v1.0
export interface CatalogueColumnMapping {
  productCode: string;
  amazonAsin: string;
  name: string;
  sku: string;
  sellingPrice: string;
  mrp: string;
  costPrice: string;
  quantity: string;
  gstPercent: string;
  productType: string;
  sizeType: string;
  size: string;
  color: string;
  description: string;
  returnExchangeCondition: string;
  visibility: string;
  sizeChart: string;
  pickupAddressCode: string;
  hsnCode: string;
  packagingLength: string;
  packagingBreadth: string;
  packagingHeight: string;
  packagingWeight: string;
  collections: string;
}

export interface CategorySuggestion {
  raw: string;
  path: string[];
  source: 'default' | 'inferred' | 'fallback';
}

export const catalogueColumns = [
  'Product Code',
  'Amazon ASIN',
  'Name',
  'Sku Id',
  'Selling Price',
  'MRP',
  'Cost Price',
  'Quantity',
  'Packaging Length (in cm)',
  'Packaging Breadth (in cm)',
  'Packaging Height (in cm)',
  'Packaging Weight (in kg)',
  'GST %',
  'Image 1',
  'Image 2',
  'Image 3',
  'Image 4',
  'Image 5',
  'Image 6',
  'Image 7',
  'Image 8',
  'Image 9',
  'Image 10',
  'Video 1',
  'Video 2',
  'Product Type',
  'Size Type',
  'Size',
  'Colour',
  'Description',
  'Return/Exchange Condition',
  'Visibility',
  'Size Chart',
  'Pickup Address Code',
  'HSN Code',
  'Customisation Id',
  'Associated Pixel',
  'attr_Brand',
  'attr_Type',
  'attr_Fabric',
  'attr_Ideal For',
  'attr_Fit Type',
  'attr_Pack of',
  'attr_Fabric Care',
  'attr_Occasion',
  'attr_Loom Type',
  'attr_Suitable For',
  'attr_Waistband',
  'attr_Bottom Hem',
  'attr_Pockets',
  'attr_Primary Color',
  'attr_Hardware/Accents',
  'attr_Ideal for',
  'attr_PACK OF',
  'attr_SUITABLE FOR',
  'attr_Product Type',
  'attr_FABRIC GSM',
  'attr_Material Composition',
  'attr_Fabric Weight & Feel',
  'attr_Multi-Use Performance',
  'attr_Premium Finishes',
  'attr_Functional Storage',
  'attr_Colorway Appeal',
  'attr_Waist Design',
  'attr_Hemline Detail',
  'attr_Product Longevity',
  'attr_Fabric Composition',
  'attr_Weigth',
  'attr_Number of Pockets',
  'attr_visual silhouette',
  'attr_Squat-proof Durability',
  'attr_Breathability',
  'attr_Versatility',
  'attr_Category',
  'attr_collection',
  'attr_pack of',
  'attr_TARGET GENDER',
  'attr_PRIMARY COLOR',
  'attr_Waistband Style',
  'attr_Style / Vibe',
  'attr_Primary Material',
  'attr_Inseam Length',
  'attr_Pocket Type',
  'attr_Design/style',
  'attr_Activity/Use Case',
  'attr_Care Instructions',
  'attr_Suitable for'
] as const;

export const defaultMapping: CatalogueColumnMapping = {
  productCode: 'Product Code',
  amazonAsin: 'Amazon ASIN',
  name: 'Name',
  sku: 'Sku Id',
  sellingPrice: 'Selling Price',
  mrp: 'MRP',
  costPrice: 'Cost Price',
  quantity: 'Quantity',
  gstPercent: 'GST %',
  productType: 'Product Type',
  sizeType: 'Size Type',
  size: 'Size',
  color: 'Colour',
  description: 'Description',
  returnExchangeCondition: 'Return/Exchange Condition',
  visibility: 'Visibility',
  sizeChart: 'Size Chart',
  pickupAddressCode: 'Pickup Address Code',
  hsnCode: 'HSN Code',
  packagingLength: 'Packaging Length (in cm)',
  packagingBreadth: 'Packaging Breadth (in cm)',
  packagingHeight: 'Packaging Height (in cm)',
  packagingWeight: 'Packaging Weight (in kg)',
  collections: 'attr_collection'
};

const duplicateAttributeKeys: Record<string, string> = {
  'ideal for': 'Ideal For',
  'pack of': 'Pack Of',
  'suitable for': 'Suitable For',
  'primary color': 'Primary Color'
};

const titleCase = (value: string): string => value.split(/[\s_/-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');

export const slugify = (value: string): string => value.toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'catalogue-item';

export const numberFromCell = (value: string | undefined): number | undefined => {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const booleanFromCell = (value: string | undefined): boolean => !['false', '0', 'no', 'hidden', 'draft'].includes((value ?? '').trim().toLowerCase());

export const normalizeAttributes = (row: Record<string, string>): Record<string, string> => {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!key.startsWith('attr_') || !value.trim()) continue;
    const raw = key.replace(/^attr_/, '').trim();
    const compact = raw.toLowerCase().replace(/\s+/g, ' ');
    const label = duplicateAttributeKeys[compact] ?? titleCase(raw);
    if (!normalized[label]) normalized[label] = value.trim();
  }
  return normalized;
};

const defaultCategoryMap: Record<string, string[]> = {
  mens_clothing__mens_western_wear__track_pants_joggers: ['Men', 'Clothing', 'Track Pants & Joggers'],
  mens_clothing__mens_inner_wear_night_wear__shorts: ['Men', 'Clothing', 'Shorts'],
  mens_clothing__mens_western_wear__t_shirt: ['Men', 'Clothing', 'T-Shirts'],
  mens_clothing__mens_western_wear__pants: ['Men', 'Clothing', 'Pants'],
  mens_clothing__mens_western_wear__cargos: ['Men', 'Clothing', 'Cargos'],
  mens_clothing__mens_western_wear__sweaters_sweatshirt: ['Men', 'Clothing', 'Sweatshirts'],
  mens_accessories__mens_other_accessories__apparel_accesories: ['Men', 'Accessories']
};

export const suggestCategory = (rawProductType: string, productName: string, attributeType?: string): CategorySuggestion => {
  const raw = rawProductType.trim();
  if (defaultCategoryMap[raw]) return { raw, path: defaultCategoryMap[raw], source: 'default' };
  const haystack = [productName, attributeType, raw].join(' ').toLowerCase();
  if (haystack.includes('cargo')) return { raw, path: ['Men', 'Clothing', 'Cargos'], source: 'inferred' };
  if (haystack.includes('short')) return { raw, path: ['Men', 'Clothing', 'Shorts'], source: 'inferred' };
  if (haystack.includes('track pant') || haystack.includes('jogger') || haystack.includes('sweatpant')) return { raw, path: ['Men', 'Clothing', 'Track Pants & Joggers'], source: 'inferred' };
  if (haystack.includes('compression') || haystack.includes('t-shirt') || haystack.includes('tee')) return { raw, path: ['Men', 'Clothing', 'T-Shirts'], source: 'inferred' };
  return { raw, path: ['Men', 'Clothing'], source: 'fallback' };
};

export const parseCollectionNames = (value: string | undefined): string[] => Array.from(new Set((value ?? '').split(',').map((item) => item.trim()).filter(Boolean)));

