// Governed by .rules v1.0
'use client';

import { Share2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AddToCartButton } from '@/components/product/add-to-cart-button';
import { ImageGallery } from '@/components/product/image-gallery';
import { ReviewSection } from '@/components/product/review-section';
import { SizeGuideModal } from '@/components/product/size-guide-modal';
import { VariantSelector } from '@/components/product/variant-selector';
import { WishlistButton } from '@/components/product/wishlist-button';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { formatPrice } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types/product.types';

export interface ProductDetailProps { product: Product; }
export function ProductDetail({ product }: ProductDetailProps): ReactNode {
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [colorVariant, setColorVariant] = useState<ProductVariant | null>(product.variants.find((item) => item.enabled !== false && item.stock > 0) ?? product.variants[0] ?? null);
  const stock = variant?.stock ?? colorVariant?.stock ?? 0;
  const share = (): void => { void navigator.clipboard.writeText(window.location.href); };
  const galleryVariant = variant ?? colorVariant;
  const displayImages = galleryVariant?.images && galleryVariant.images.length > 0 ? galleryVariant.images : product.images;
  const displayPrice = variant?.price ?? product.basePrice;

  return (
    <main className="px-6 pb-20 pt-24 lg:px-20">
      <Breadcrumb items={[{ label: COPY.nav.home, href: ROUTES.home }, { label: COPY.nav.shop, href: ROUTES.shop }, { label: product.title, href: '/product/' + product.slug }]} />
      <div className="mt-8 grid min-w-0 gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <ImageGallery images={displayImages} />
        {product.videoUrl ? <div className="overflow-hidden border border-border-subtle bg-background-elevated lg:hidden">
          <video src={product.mobileVideoUrl || product.videoUrl} poster={product.videoPosterImage || product.images[0]?.url} className="aspect-[3/4] w-full object-cover" controls playsInline />
        </div> : null}
        <section className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{product.brand}</p>
          <h1 className="mt-3 font-display text-4xl font-light text-text-primary">{product.title}</h1>
          <p className="mt-4 font-mono text-xl text-accent-gold" aria-live="polite">{formatPrice(displayPrice)}</p>
          {stock > 0 && stock < 5 ? <p className="mt-3 text-sm text-warning">{COPY.product.onlyLeft.replace('{count}', String(stock))}</p> : null}
          <div className="mt-10">
            <VariantSelector variants={product.variants} onChange={setVariant} onColorChange={setColorVariant} />
          </div>
          {variant ? <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-3 text-xs uppercase tracking-[0.12em] text-text-secondary" aria-live="polite"><span>SKU <strong className="ml-2 font-mono font-normal text-text-primary">{variant.sku}</strong></span><span>Stock <strong className="ml-2 font-mono font-normal text-text-primary">{variant.stock}</strong></span></div> : <p className="mt-5 text-sm text-text-muted">Choose a size to confirm the exact SKU and availability.</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <SizeGuideModal />
            <WishlistButton productId={product.id} next={'/product/' + product.slug} />
            <Button variant="ghost" onClick={share}><Share2 size={16} /> {COPY.product.share}</Button>
          </div>
          <div className="mt-8">
            <AddToCartButton product={product} variant={variant} />
          </div>
          <details className="mt-10 border-t border-border py-6" open>
            <summary className="cursor-pointer font-accent text-xs uppercase tracking-[0.15em]">{COPY.product.description}</summary>
            <p className="mt-4 text-text-secondary">{product.richDescription}</p>
            {product.productHighlights && product.productHighlights.length > 0 ? <ul className="mt-4 grid gap-2 text-sm text-text-secondary">{product.productHighlights.map((highlight) => <li key={highlight}>- {highlight}</li>)}</ul> : null}
          </details>
          {product.videoUrl ? <div className="mt-8 hidden overflow-hidden border border-border-subtle bg-background-elevated lg:block">
            <video src={product.videoUrl} poster={product.videoPosterImage || product.images[0]?.url} className="aspect-video w-full object-cover" controls playsInline />
          </div> : null}
          {product.materialCare ? <details className="border-t border-border py-6">
            <summary className="cursor-pointer font-accent text-xs uppercase tracking-[0.15em]">Material & Care</summary>
            <p className="mt-4 text-text-secondary">{product.materialCare}</p>
          </details> : null}
          {product.fitDetails ? <details className="border-t border-border py-6">
            <summary className="cursor-pointer font-accent text-xs uppercase tracking-[0.15em]">Fit Details</summary>
            <p className="mt-4 text-text-secondary">{product.fitDetails}</p>
          </details> : null}
          <details className="border-t border-border py-6">
            <summary className="cursor-pointer font-accent text-xs uppercase tracking-[0.15em]">{COPY.product.shipping}</summary>
            <p className="mt-4 text-text-secondary">{product.shippingReturns || 'Ships with tracking in 2-5 business days. Returns are accepted on unworn pieces with original tags.'}</p>
          </details>
        </section>
      </div>
      <ReviewSection reviews={product.reviews} rating={product.ratings.avg} count={product.ratings.count} />
    </main>
  );
}
