import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const root = process.cwd();
const fixturesDir = path.join(root, 'test-fixtures/catalogues');
const realCsvPath = path.join(fixturesDir, 'real-cruisin-catalogue.csv');
const apiBase = process.env.QA_API_URL ?? 'http://localhost:8000/api/v1';
const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/cruisin';
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@cruisin.local';
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'CruisinAdmin123';

const report = {
  startedAt: new Date().toISOString(),
  apiBase,
  checks: [],
  bugsFixedDuringQa: [
    'Public product API now excludes costPrice and raw catalogue import metadata.',
    'Catalogue validator now blocks missing Product Code and textual price/stock cells.',
    'Catalogue upload response no longer returns the stored import file record.',
    'Stored catalogue filenames are normalized.',
    'Export/import now supports slug fallback for products without productCode.'
  ],
  realCsv: {},
  badFixtures: {},
  security: {},
  performance: {},
  export: {},
  idempotency: {},
  settings: {},
  storefrontPrivacy: {}
};

const mark = (name, status, details = {}) => {
  report.checks.push({ name, status, ...details });
  if (status !== 'pass') console.error(name, status, details);
};

const assert = (condition, message, details = {}) => {
  if (!condition) {
    mark(message, 'fail', details);
    throw new Error(message);
  }
  mark(message, 'pass', details);
};

const api = async (pathName, options = {}, token) => {
  const headers = new Headers(options.headers ?? {});
  if (token) headers.set('Authorization', 'Bearer ' + token);
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.json);
  }
  const response = await fetch(apiBase + pathName, { ...options, headers });
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
};

const login = async (email, password) => {
  const result = await api('/auth/login', { method: 'POST', json: { email, password } });
  assert(result.response.ok, 'Admin login works', { status: result.response.status });
  return result.body.data.accessToken;
};

const uploadCsv = async (filename, csv, token, type = 'text/csv') => {
  const form = new FormData();
  form.append('file', new Blob([csv], { type }), filename);
  return api('/admin/catalogues/import/upload', { method: 'POST', body: form }, token);
};

const csvEscape = (value) => {
  const text = String(value ?? '');
  return '"' + text.replace(/"/g, '""') + '"';
};

const csvFromRows = (headers, rows) => [headers.map(csvEscape).join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? '')).join(','))].join('\n');

const baseRow = (headers, patch = {}) => {
  const row = Object.fromEntries(headers.map((header) => [header, '']));
  Object.assign(row, {
    'Product Code': 'QA-CAT-001',
    Name: 'QA Catalogue Tee',
    'Sku Id': 'QA-CAT-001-S',
    'Selling Price': '799',
    MRP: '1299',
    'Cost Price': '200',
    Quantity: '5',
    'GST %': '5',
    'Product Type': 'mens_clothing__mens_western_wear__t_shirt',
    'Size Type': 'size',
    Size: 'S',
    Colour: 'Black',
    Description: '<Ul><Li><Strong>QA</Strong> catalogue product</Li></Ul>',
    Visibility: 'true',
    'Image 1': 'https://example.com/qa.jpg',
    attr_Brand: 'Cruisin',
    attr_Type: 'Oversized Tee',
    attr_collection: 'QA Collection'
  }, patch);
  return row;
};

const generateFixtures = async (headers) => {
  await mkdir(fixturesDir, { recursive: true });
  const fixtures = {
    'missing-product-code.csv': [baseRow(headers, { 'Product Code': '' })],
    'duplicate-sku.csv': [baseRow(headers, { 'Product Code': 'QA-DUP-001', 'Sku Id': 'QA-DUP-S', Size: 'S' }), baseRow(headers, { 'Product Code': 'QA-DUP-002', 'Sku Id': 'QA-DUP-S', Size: 'M' })],
    'invalid-price.csv': [baseRow(headers, { 'Selling Price': 'not-a-price' })],
    'price-greater-than-mrp.csv': [baseRow(headers, { 'Selling Price': '2000', MRP: '1000' })],
    'invalid-stock.csv': [baseRow(headers, { Quantity: 'many' })],
    'invalid-media-url.csv': [baseRow(headers, { 'Image 1': 'not-a-url' })],
    'xss-description.csv': [baseRow(headers, { Description: '<script>alert("xss")</script>' })],
    'blank-important-fields.csv': [baseRow(headers, { Name: '', 'Sku Id': '', Size: '', 'Selling Price': '' })]
  };
  for (const [filename, rows] of Object.entries(fixtures)) {
    await writeFile(path.join(fixturesDir, filename), csvFromRows(headers, rows));
  }
  const largeRows = [];
  for (let product = 1; product <= 500; product += 1) {
    for (const size of ['XS', 'S', 'M', 'L', 'XL']) {
      const code = 'QA-LARGE-' + String(product).padStart(4, '0');
      largeRows.push(baseRow(headers, {
        'Product Code': code,
        Name: 'QA Large Product ' + product,
        'Sku Id': code + '-' + size,
        Size: size,
        Quantity: String(10 + product),
        'Image 1': 'https://example.com/large-' + product + '.jpg',
        attr_collection: product % 10 === 0 ? 'QA Large Collection' : ''
      }));
    }
  }
  const largeCsv = csvFromRows(headers, largeRows);
  await writeFile(path.join(fixturesDir, 'large-2500-rows.csv'), largeCsv);
  return { fixtures, largeCsv };
};

const productPage = async (token, params = {}) => {
  const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 100), ...(params.q ? { q: params.q } : {}) });
  const result = await api('/products/admin/catalogue?' + query.toString(), {}, token);
  assert(result.response.ok, 'Admin products API works', { status: result.response.status });
  return result.body.data;
};

const productCounts = async (token) => {
  const first = await productPage(token, { page: 1, limit: 100 });
  let variants = 0;
  for (let page = 1; page <= Math.max(1, first.pages); page += 1) {
    const data = page === 1 ? first : await productPage(token, { page, limit: 100 });
    variants += data.items.reduce((sum, product) => sum + (product.variants?.length ?? 0), 0);
  }
  return { products: first.total, variants };
};

const listCount = async (pathName, token) => {
  const result = await api(pathName, {}, token);
  assert(result.response.ok, pathName + ' list works', { status: result.response.status });
  const data = result.body.data;
  return Array.isArray(data) ? data.length : (data.items?.length ?? 0);
};

const createVerifiedCustomer = async () => {
  await mongoose.connect(mongoUri);
  const email = 'catalogue-qa-customer-' + Date.now() + '@example.com';
  await mongoose.connection.collection('users').insertOne({
    name: 'Catalogue QA Customer',
    email,
    passwordHash: await bcrypt.hash('CustomerQa123', 12),
    role: 'customer',
    isActive: true,
    isVerified: true,
    emailVerifiedAt: new Date(),
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await mongoose.disconnect();
  const result = await api('/auth/login', { method: 'POST', json: { email, password: 'CustomerQa123' } });
  assert(result.response.ok, 'Verified non-admin login works', { status: result.response.status });
  return result.body.data.accessToken;
};

const main = async () => {
  const realCsv = await readFile(realCsvPath, 'utf8');
  const headers = realCsv.split(/\r?\n/, 1)[0].replace(/^\uFEFF/, '').split(',').map((header) => header.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
  const { fixtures, largeCsv } = await generateFixtures(headers);

  const health = await fetch(apiBase.replace('/api/v1', '') + '/health');
  assert(health.ok, 'Backend /health returns 200', { status: health.status });

  const noTokenChecks = [
    ['/admin/catalogues/imports', { method: 'GET' }],
    ['/admin/catalogues/import/confirm', { method: 'POST', json: { importId: '000000000000000000000000' } }],
    ['/admin/catalogues/export', { method: 'POST', json: { exportType: 'full' } }]
  ];
  for (const [pathName, options] of noTokenChecks) {
    const result = await api(pathName, options);
    assert(result.response.status === 401, 'Unauthenticated ' + options.method + ' ' + pathName + ' returns 401', { status: result.response.status });
  }

  const token = await login(adminEmail, adminPassword);
  const customerToken = await createVerifiedCustomer();
  const forbidden = await api('/admin/catalogues/imports', {}, customerToken);
  assert(forbidden.response.status === 403, 'Non-admin catalogue API returns 403', { status: forbidden.response.status });

  const before = {
    products: await productCounts(token),
    categories: await listCount('/admin/categories', token),
    collections: await listCount('/admin/collections', token)
  };

  const realUpload = await uploadCsv('real-cruisin-catalogue.csv', realCsv, token);
  assert(realUpload.response.ok, 'Real CSV upload/preview returns 201', { status: realUpload.response.status });
  const realParsed = realUpload.body.data.parsed;
  report.realCsv.detectedRows = realParsed.rowCount;
  report.realCsv.detectedProductCodes = realParsed.productGroupCount;
  report.realCsv.detectedColumns = realParsed.headers.length;
  report.realCsv.warnings = realParsed.validation.warnings.length;
  report.realCsv.errors = realParsed.validation.errors.length;
  assert(realParsed.rowCount === 235, 'Real CSV detects 235 rows', report.realCsv);
  assert(realParsed.productGroupCount === 44, 'Real CSV groups into 44 product codes', report.realCsv);
  assert(realParsed.validation.errors.length === 0, 'Real CSV has no blocking validation errors', { errors: realParsed.validation.errors });

  const dryBefore = await productCounts(token);
  const dryRun = await api('/admin/catalogues/import/dry-run', { method: 'POST', json: { importId: realUpload.body.data.importId, importMode: 'upsert' } }, token);
  assert(dryRun.response.ok, 'Real CSV dry-run succeeds', { status: dryRun.response.status });
  const dryAfter = await productCounts(token);
  assert(dryBefore.products === dryAfter.products && dryBefore.variants === dryAfter.variants, 'Dry-run does not write products or variants', { before: dryBefore, after: dryAfter });

  const confirm = await api('/admin/catalogues/import/confirm', { method: 'POST', json: { importId: realUpload.body.data.importId, importMode: 'upsert' } }, token);
  assert(confirm.response.ok, 'Real CSV confirmed import succeeds', { status: confirm.response.status });
  report.realCsv.importResult = confirm.body.data;

  const afterImport = {
    products: await productCounts(token),
    categories: await listCount('/admin/categories', token),
    collections: await listCount('/admin/collections', token)
  };
  report.realCsv.before = before;
  report.realCsv.afterImport = afterImport;
  assert(afterImport.products.products >= before.products.products, 'Confirmed import does not reduce product count', { before: before.products, after: afterImport.products });
  assert(afterImport.products.variants >= before.products.variants + 200 || confirm.body.data.updatedVariants >= 200, 'Confirmed import creates/updates catalogue variants', confirm.body.data);

  const samplePage = await productPage(token, { q: 'Crusiin106 - Dark Grey' });
  const sample = samplePage.items[0];
  assert(Boolean(sample), 'Imported product searchable by Product Code', { total: samplePage.total });
  assert((sample.variants?.length ?? 0) >= 2, 'Imported product has grouped variants', { variants: sample.variants?.length });
  assert(sample.images?.length > 0, 'Imported product has images', { images: sample.images?.length });
  assert(sample.basePrice === 1099, 'Imported product price maps from Selling Price', { basePrice: sample.basePrice });
  assert(sample.comparePrice === 2299, 'Imported product MRP maps to compare price', { comparePrice: sample.comparePrice });

  const publicProduct = await api('/products/' + sample.slug);
  assert(publicProduct.response.ok, 'Imported PDP public API loads', { slug: sample.slug });
  const publicText = JSON.stringify(publicProduct.body.data);
  report.storefrontPrivacy.sampleSlug = sample.slug;
  report.storefrontPrivacy.costPriceHidden = !publicText.includes('costPrice') && !publicText.includes('"200"');
  report.storefrontPrivacy.rawImportHidden = !publicText.includes('rawCatalogueAttributes') && !publicText.includes('lastCatalogueImportId');
  assert(report.storefrontPrivacy.costPriceHidden, 'Public product API hides costPrice');
  assert(report.storefrontPrivacy.rawImportHidden, 'Public product API hides raw import metadata');

  const secondUpload = await uploadCsv('real-cruisin-catalogue.csv', realCsv, token);
  const secondDryRun = await api('/admin/catalogues/import/dry-run', { method: 'POST', json: { importId: secondUpload.body.data.importId, importMode: 'upsert' } }, token);
  assert(secondDryRun.response.ok, 'Second real CSV dry-run succeeds');
  const beforeSecondConfirm = await productCounts(token);
  const secondConfirm = await api('/admin/catalogues/import/confirm', { method: 'POST', json: { importId: secondUpload.body.data.importId, importMode: 'upsert' } }, token);
  const afterSecondConfirm = await productCounts(token);
  report.idempotency.secondImport = secondConfirm.body.data;
  report.idempotency.before = beforeSecondConfirm;
  report.idempotency.after = afterSecondConfirm;
  assert(beforeSecondConfirm.products === afterSecondConfirm.products, 'Re-import does not duplicate products', report.idempotency);
  assert(beforeSecondConfirm.variants === afterSecondConfirm.variants, 'Re-import does not duplicate variants', report.idempotency);

  const exportResult = await api('/admin/catalogues/export', { method: 'POST', json: { exportType: 'full' } }, token);
  assert(exportResult.response.ok, 'Full catalogue export succeeds', { status: exportResult.response.status });
  const exported = exportResult.body.data;
  report.export.filename = exported.filename;
  report.export.rowCount = exported.rowCount;
  report.export.productCount = exported.productCount;
  report.export.exportId = exported.exportId;
  assert(/^cruisin_catalogue_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/.test(exported.filename), 'Export filename is safe', { filename: exported.filename });
  assert(exported.csv.includes('"Product Code"') && exported.csv.includes('"Sku Id"') && exported.csv.includes('"Image 1"'), 'Export contains required columns');
  await writeFile(path.join(fixturesDir, 'last-export.csv'), exported.csv);
  const download = await api('/admin/catalogues/exports/' + exported.exportId + '/download', {}, token);
  assert(download.response.ok && String(download.body).includes('"Product Code"'), 'Export download works');

  const exportedUpload = await uploadCsv('last-export.csv', exported.csv, token);
  assert(exportedUpload.response.ok, 'Exported CSV uploads for reimport preview');
  const exportedDryRun = await api('/admin/catalogues/import/dry-run', { method: 'POST', json: { importId: exportedUpload.body.data.importId, importMode: 'upsert' } }, token);
  report.export.reimportDryRun = exportedDryRun.body.data.summary;
  assert(exportedDryRun.response.ok && exportedDryRun.body.data.canImport, 'Exported CSV dry-run can import safely', { validation: exportedDryRun.body.data.validation });

  for (const filename of Object.keys(fixtures)) {
    const csv = await readFile(path.join(fixturesDir, filename), 'utf8');
    const result = await uploadCsv(filename, csv, token);
    assert(result.response.ok, filename + ' uploads to validation preview');
    const validation = result.body.data.parsed.validation;
    report.badFixtures[filename] = {
      errors: validation.errors.map((issue) => issue.field + ': ' + issue.message),
      warnings: validation.warnings.map((issue) => issue.field + ': ' + issue.message)
    };
  }
  assert(report.badFixtures['missing-product-code.csv'].errors.some((item) => item.includes('Product Code')), 'Missing Product Code fixture is blocked');
  assert(report.badFixtures['invalid-price.csv'].errors.some((item) => item.includes('Selling Price')), 'Invalid price fixture is blocked');
  assert(report.badFixtures['invalid-stock.csv'].errors.some((item) => item.includes('Quantity')), 'Invalid stock fixture is blocked');
  assert(report.badFixtures['xss-description.csv'].errors.some((item) => item.includes('Description')), 'XSS description fixture is blocked');
  assert(report.badFixtures['duplicate-sku.csv'].warnings.some((item) => item.includes('Duplicate SKU')), 'Duplicate SKU fixture warns');
  assert(report.badFixtures['price-greater-than-mrp.csv'].warnings.some((item) => item.includes('Selling Price')), 'Price greater than MRP fixture warns');
  assert(report.badFixtures['invalid-media-url.csv'].warnings.some((item) => item.includes('Image')), 'Invalid media URL fixture warns');

  const txt = await uploadCsv('not-a-csv.txt', 'hello', token, 'text/plain');
  assert(txt.response.status === 400, 'Non-CSV upload is rejected', { status: txt.response.status });
  const traversal = await uploadCsv('../../evil.csv', realCsv, token);
  assert(traversal.response.ok && !traversal.body.data.filename.includes('..') && !traversal.body.data.filename.includes('/'), 'Path traversal filename is normalized', { filename: traversal.body.data.filename });
  report.security.pathTraversalFilename = traversal.body.data.filename;

  const dangerousProduct = await api('/products', {
    method: 'POST',
    json: {
      title: '=SUM(1,1) QA Injection',
      slug: 'qa-injection-' + Date.now(),
      description: 'QA injection product with safe long description.',
      richDescription: 'QA injection product with safe long description.',
      brand: 'Cruisin',
      category: sample.category?._id ?? sample.category,
      categoryIds: [sample.category?._id ?? sample.category],
      collections: [],
      collectionSlugs: [],
      images: [{ url: 'https://example.com/injection.jpg', alt: '=SUM(1,1) QA Injection', width: 1200, height: 1600 }],
      basePrice: 10,
      comparePrice: 20,
      variants: [{ size: 'S', color: 'Black', colorHex: '#111111', sku: 'QA-INJECTION-' + Date.now(), price: 10, stock: 1, enabled: true, images: [] }],
      tags: [],
      gender: 'unisex',
      status: 'published',
      visibility: 'visible',
      isActive: true,
      isArchived: false,
      isFeatured: false,
      seo: {}
    }
  }, token);
  assert(dangerousProduct.response.status === 201, 'CSV injection test product can be created');
  const injectionExport = await api('/admin/catalogues/export', { method: 'POST', json: { exportType: 'full' } }, token);
  report.security.csvInjectionNeutralized = injectionExport.body.data.csv.includes("'=SUM(1,1) QA Injection");
  assert(report.security.csvInjectionNeutralized, 'CSV injection fields are neutralized in export');
  await api('/products/' + dangerousProduct.body.data._id, { method: 'DELETE' }, token);

  const settingsBefore = await api('/admin/catalogues/settings', {}, token);
  assert(settingsBefore.response.ok, 'Catalogue settings load');
  const settingsOn = await api('/admin/catalogues/settings', { method: 'PATCH', json: { autoGenerateOnProductUpdate: true } }, token);
  assert(settingsOn.response.ok && settingsOn.body.data.autoGenerateOnProductUpdate === true, 'Auto-generate setting turns on');
  await api('/products/' + sample._id, { method: 'PUT', json: { isFeatured: !sample.isFeatured } }, token);
  const settingsStale = await api('/admin/catalogues/settings', {}, token);
  report.settings.staleAfterProductUpdate = settingsStale.body.data.isCatalogueStale;
  assert(settingsStale.body.data.isCatalogueStale === true, 'Product update marks catalogue stale');
  const regen = await api('/admin/catalogues/export', { method: 'POST', json: { exportType: 'full' } }, token);
  assert(regen.response.ok, 'Generate latest catalogue after stale succeeds');
  const settingsFresh = await api('/admin/catalogues/settings', {}, token);
  report.settings.staleAfterRegenerate = settingsFresh.body.data.isCatalogueStale;
  assert(settingsFresh.body.data.isCatalogueStale === false, 'Export regeneration clears stale flag');
  await api('/admin/catalogues/settings', { method: 'PATCH', json: { autoGenerateOnProductUpdate: false } }, token);

  const largeStart = Date.now();
  const largeUpload = await uploadCsv('large-2500-rows.csv', largeCsv, token);
  const largeUploadMs = Date.now() - largeStart;
  assert(largeUpload.response.ok, 'Large 2500-row upload/preview succeeds', { ms: largeUploadMs });
  const largeDryStart = Date.now();
  const largeDry = await api('/admin/catalogues/import/dry-run', { method: 'POST', json: { importId: largeUpload.body.data.importId, importMode: 'upsert' } }, token);
  const largeDryMs = Date.now() - largeDryStart;
  report.performance.large2500 = { uploadMs: largeUploadMs, dryRunMs: largeDryMs, rows: largeUpload.body.data.parsed.rowCount, groups: largeUpload.body.data.parsed.productGroupCount };
  assert(largeDry.response.ok && largeDry.body.data.canImport, 'Large 2500-row dry-run succeeds', report.performance.large2500);

  report.completedAt = new Date().toISOString();
  await writeFile(path.join(root, 'catalogue-rigorous-qa-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
};

main().catch(async (error) => {
  report.completedAt = new Date().toISOString();
  report.fatalError = error instanceof Error ? error.message : String(error);
  await writeFile(path.join(root, 'catalogue-rigorous-qa-results.json'), JSON.stringify(report, null, 2)).catch(() => undefined);
  console.error(error);
  process.exit(1);
});
