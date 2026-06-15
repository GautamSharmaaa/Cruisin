import fs from 'fs';
import path from 'path';

const controllersDir = path.resolve('./src/controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Match pattern: req.body as { ... } or req.body as Record<string, unknown>
  // We want to replace `req: Request` with `req: Request<unknown, unknown, Type>`
  // and `req.body as Type` with `req.body`

  // 1. cart.controller.ts
  if (file === 'cart.controller.ts') {
    content = content.replace(
      /add: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const cart = await CartService\.add\(req\.user\?\.userId, req\.sessionId, req\.body as (\{ product: string; variant: string; quantity: number \})\);/,
      'add: asyncHandler(async (req: Request<unknown, unknown, { product: string; variant: string; quantity: number }>, res: Response): Promise<void> => { const cart = await CartService.add(req.user?.userId, req.sessionId, req.body);'
    );
    content = content.replace(
      /update: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const cart = await CartService\.update\(req\.user\?\.userId, req\.sessionId, req\.body as (\{ product: string; variant: string; quantity: number \})\);/,
      'update: asyncHandler(async (req: Request<unknown, unknown, { product: string; variant: string; quantity: number }>, res: Response): Promise<void> => { const cart = await CartService.update(req.user?.userId, req.sessionId, req.body);'
    );
    content = content.replace(
      /applyCoupon: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const result = await CartService\.applyCoupon\(req\.user\?\.userId, req\.sessionId, \(req\.body as (\{ code: string \})\)\.code\);/,
      'applyCoupon: asyncHandler(async (req: Request<unknown, unknown, { code: string }>, res: Response): Promise<void> => { const result = await CartService.applyCoupon(req.user?.userId, req.sessionId, req.body.code);'
    );
  }

  // 2. category.controller.ts
  if (file === 'category.controller.ts') {
    content = content.replace(
      /create: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{\n\s+const category = await CategoryService\.create\(req\.body as Record<string, unknown>\);/,
      'create: asyncHandler(async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response): Promise<void> => {\n    const category = await CategoryService.create(req.body);'
    );
    content = content.replace(
      /update: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{\n\s+const category = await CategoryService\.update\(String\(req\.params\.id \?\? ''\), req\.body as Record<string, unknown>\);/,
      'update: asyncHandler(async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response): Promise<void> => {\n    const category = await CategoryService.update(String(req.params.id ?? \'\'), req.body);'
    );
    content = content.replace(
      /reorder: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{\n\s+await CategoryService\.reorder\(\(req\.body as \{ ids: string\[\] \}\)\.ids\);/,
      'reorder: asyncHandler(async (req: Request<unknown, unknown, { ids: string[] }>, res: Response): Promise<void> => {\n    await CategoryService.reorder(req.body.ids);'
    );
  }

  // 3. cms.controller.ts
  if (file === 'cms.controller.ts') {
    content = content.replace(
      /createBanner: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const banner = await CmsService\.upsertBanner\(req\.body as Record<string, unknown>\);/,
      'createBanner: asyncHandler(async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const banner = await CmsService.upsertBanner(req.body);'
    );
    content = content.replace(
      /reorder: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ await CmsService\.reorder\(\(req\.body as \{ ids: string\[\] \}\)\.ids\);/,
      'reorder: asyncHandler(async (req: Request<unknown, unknown, { ids: string[] }>, res: Response): Promise<void> => { await CmsService.reorder(req.body.ids);'
    );
  }

  // 4. coupon.controller.ts
  if (file === 'coupon.controller.ts') {
    content = content.replace(
      /create: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{\n\s+const coupon = await CouponService\.create\(req\.body as Record<string, unknown>\);/,
      'create: asyncHandler(async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response): Promise<void> => {\n    const coupon = await CouponService.create(req.body);'
    );
    content = content.replace(
      /update: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{\n\s+const coupon = await CouponService\.update\(String\(req\.params\.id \?\? ''\), req\.body as Record<string, unknown>\);/,
      'update: asyncHandler(async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response): Promise<void> => {\n    const coupon = await CouponService.update(String(req.params.id ?? \'\'), req.body);'
    );
  }

  // 5. order.controller.ts
  if (file === 'order.controller.ts') {
    content = content.replace(
      /checkout: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const result = await OrderService\.checkout\(req\.user\?\.userId, req\.sessionId, req\.body as \{ shippingAddress: Record<string, unknown>; billingAddress: Record<string, unknown>; paymentMethod: PaymentMethod; couponCode\?: string \}\);/,
      'checkout: asyncHandler(async (req: Request<unknown, unknown, { shippingAddress: Record<string, unknown>; billingAddress: Record<string, unknown>; paymentMethod: PaymentMethod; couponCode?: string }>, res: Response): Promise<void> => { const result = await OrderService.checkout(req.user?.userId, req.sessionId, req.body);'
    );
    content = content.replace(
      /verify: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const body = req\.body as \{ method: PaymentMethod; payload: Record<string, unknown> \}; const result = await OrderService\.verifyPayment\(body\.method, body\.payload\);/,
      'verify: asyncHandler(async (req: Request<unknown, unknown, { method: PaymentMethod; payload: Record<string, unknown> }>, res: Response): Promise<void> => { const result = await OrderService.verifyPayment(req.body.method, req.body.payload);'
    );
    content = content.replace(
      /updateStatus: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const order = await OrderService\.updateStatus\(String\(req\.params\.id \?\? ''\), req\.body as \{ status: string; note\?: string; trackingNumber\?: string \}\);/,
      'updateStatus: asyncHandler(async (req: Request<unknown, unknown, { status: string; note?: string; trackingNumber?: string }>, res: Response): Promise<void> => { const order = await OrderService.updateStatus(String(req.params.id ?? \'\'), req.body);'
    );
  }

  // 6. payment.controller.ts
  if (file === 'payment.controller.ts') {
    content = content.replace(
      /refund: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{\n\s+const body = req\.body as \{ method: PaymentMethod; paymentId: string; amount: number \};\n\s+const refund = await OrderService\.refund\(body\.method, body\.paymentId, body\.amount\);/,
      'refund: asyncHandler(async (req: Request<unknown, unknown, { method: PaymentMethod; paymentId: string; amount: number }>, res: Response): Promise<void> => {\n    const refund = await OrderService.refund(req.body.method, req.body.paymentId, req.body.amount);'
    );
  }

  // 7. product.controller.ts
  if (file === 'product.controller.ts') {
    content = content.replace(
      /create: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const product = await ProductService\.create\(req\.body as Record<string, unknown>\);/,
      'create: asyncHandler(async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const product = await ProductService.create(req.body);'
    );
    content = content.replace(
      /update: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const product = await ProductService\.update\(String\(req\.params\.id \?\? ''\), req\.body as Record<string, unknown>\);/,
      'update: asyncHandler(async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const product = await ProductService.update(String(req.params.id ?? \'\'), req.body);'
    );
  }

  // 8. review.controller.ts
  if (file === 'review.controller.ts') {
    content = content.replace(
      /create: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const review = await ReviewService\.create\(req\.user\?\.userId \?\? '', req\.body as Record<string, unknown>\);/,
      'create: asyncHandler(async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const review = await ReviewService.create(req.user?.userId ?? \'\', req.body);'
    );
    content = content.replace(
      /moderate: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{ const review = await ReviewService\.moderate\(String\(req\.params\.id \?\? ''\), \(req\.body as \{ status: string \}\)\.status\);/,
      'moderate: asyncHandler(async (req: Request<unknown, unknown, { status: string }>, res: Response): Promise<void> => { const review = await ReviewService.moderate(String(req.params.id ?? \'\'), req.body.status);'
    );
  }

  // 9. user.controller.ts
  if (file === 'user.controller.ts') {
    content = content.replace(
      /update: asyncHandler\(async \(req: Request, res: Response\): Promise<void> => \{\n\s+const user = await UserService\.update\(String\(req\.params\.id \?\? ''\), req\.body as Record<string, unknown>\);/,
      'update: asyncHandler(async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response): Promise<void> => {\n    const user = await UserService.update(String(req.params.id ?? \'\'), req.body);'
    );
  }

  fs.writeFileSync(filePath, content);
}

console.log('Refactoring complete');
