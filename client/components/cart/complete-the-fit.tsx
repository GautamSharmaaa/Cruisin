// Governed by .rules v1.0
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Star, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SafeImage } from '@/components/shared/safe-image';
import { useCartRecommendations } from '@/hooks/useCartRecommendations';
import { addProductToCart } from '@/lib/meta-actions';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import type { Product, ProductVariant } from '@/types/product.types';

export interface CompleteTheFitProps { context?: 'page' | 'drawer'; }

const enabledVariants = (product: Product): ProductVariant[] => product.variants.filter((variant) => variant.enabled !== false);
const sellableVariants = (product: Product): ProductVariant[] => enabledVariants(product).filter((variant) => variant.stock > 0);
const colorKey = (color: string): string => color.trim().toLowerCase();

export function CompleteTheFit({ context = 'page' }: CompleteTheFitProps): ReactNode {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const closeCart = useCartStore((state) => state.closeCart);
  const productIds = useMemo(() => Array.from(new Set(items.map((item) => item.product.id))), [items]);
  const recommendations = useCartRecommendations(productIds, items.length > 0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [unlockNotice, setUnlockNotice] = useState('');
  const data = recommendations.data;
  const availableProducts = (data?.items ?? []).filter((product) => !productIds.includes(product.id) && sellableVariants(product).length > 0);
  const rewardEligibleIds = data?.source === 'manual'
    ? new Set([data.anchorProductId ?? '', ...(data.eligibleProductIds ?? [])])
    : new Set(productIds);
  const observedEligibleCount = items.reduce((count, item) => (
    rewardEligibleIds.has(item.product.id) ? count + item.quantity : count
  ), 0);
  const previousEligibleCount = useRef<number | null>(null);

  useEffect(() => {
    const previous = previousEligibleCount.current;
    previousEligibleCount.current = observedEligibleCount;
    if (previous === null || observedEligibleCount <= previous) return;
    const unlocked = previous < 3 && observedEligibleCount >= 3 ? '₹300 UNLOCKED ✓' : previous < 2 && observedEligibleCount >= 2 ? '₹100 UNLOCKED ✓' : '';
    if (!unlocked) return;
    setUnlockNotice(unlocked);
    const timeout = window.setTimeout(() => setUnlockNotice(''), 1700);
    return () => window.clearTimeout(timeout);
  }, [observedEligibleCount]);

  if (!data || (!availableProducts.length && !data.bundleDiscount.enabled)) return null;

  const twoSaving = Math.min(100, Math.max(0, data.bundleDiscount.twoItemDiscount));
  const threeSaving = Math.min(300, Math.max(0, data.bundleDiscount.threeItemDiscount));
  const liveEligibleProductCount = observedEligibleCount;
  const extraThreeItemSaving = Math.max(0, threeSaving - twoSaving);
  const milestoneSteps = [
    { threshold: 1, label: '1 item', value: 'Current' },
    ...(twoSaving > 0 ? [{ threshold: 2, label: '2 items', value: `${formatPrice(twoSaving)} OFF` }] : []),
    ...(threeSaving > 0 ? [{ threshold: 3, label: '3 items', value: `${formatPrice(threeSaving)} OFF` }] : [])
  ];
  const finalThreshold = milestoneSteps.at(-1)?.threshold ?? 1;
  const milestoneProgress = finalThreshold <= 1 ? 100 : Math.max(0, Math.min(100, ((Math.min(liveEligibleProductCount, finalThreshold) - 1) / (finalThreshold - 1)) * 100));
  const currentMilestone = Math.min(Math.max(1, liveEligibleProductCount), finalThreshold);
  const rewardHeadline = unlockNotice || (liveEligibleProductCount >= 3
    ? `${formatPrice(threeSaving)} saved ✓`
    : liveEligibleProductCount >= 2
      ? `${formatPrice(twoSaving)} saved — add 1 more to unlock ${formatPrice(threeSaving)}`
      : `Add 1 more → save ${formatPrice(twoSaving)}`);
  const rewardSupport = liveEligibleProductCount >= 3
    ? 'Maximum Complete The Fit reward unlocked.'
    : liveEligibleProductCount >= 2
      ? `One more eligible item unlocks an extra ${formatPrice(extraThreeItemSaving)}.`
      : `Then add one more to save ${formatPrice(threeSaving)} total.`;

  const closeQuickAdd = (): void => {
    setSelectedProduct(null);
    setSelectedColor('');
    setSelectedVariant(null);
    setSelectedImageIndex(0);
  };

  const addVariant = (product: Product, variant: ProductVariant): void => {
    const added = addProductToCart({ product, variant, quantity: 1, addItem });
    if (!added) {
      setAnnouncement('That option has reached its available quantity.');
      return;
    }
    if (context === 'page') closeCart();
    setAnnouncement(`${product.title}, size ${variant.size}, added to your Bag.`);
    closeQuickAdd();
  };

  const beginAdd = (product: Product): void => {
    const first = sellableVariants(product)[0];
    if (!first) return;
    setSelectedProduct(product);
    setSelectedColor(first.color);
    setSelectedVariant(first);
    setSelectedImageIndex(0);
  };

  const configuredVariants = selectedProduct ? enabledVariants(selectedProduct) : [];
  const colors = Array.from(new Map(configuredVariants.map((variant) => [colorKey(variant.color), { label: variant.color, hex: variant.colorHex }])).values());
  const variantsForColor = configuredVariants.filter((variant) => colorKey(variant.color) === colorKey(selectedColor));
  const selectedPrice = selectedVariant?.price ?? (selectedProduct ? Math.min(...sellableVariants(selectedProduct).map((variant) => variant.price)) : 0);
  const selectedImages = selectedVariant?.images.length ? selectedVariant.images : selectedProduct?.images ?? [];

  const chooseColor = (color: string): void => {
    setSelectedColor(color);
    setSelectedVariant(configuredVariants.find((variant) => colorKey(variant.color) === colorKey(color) && variant.stock > 0) ?? null);
    setSelectedImageIndex(0);
  };

  return <>
    <section className="border-y border-border-subtle bg-background-primary py-6 md:border md:py-8" aria-labelledby={`complete-the-fit-${context}`}>
      <div className="flex items-start justify-between gap-4 px-5 md:px-7">
        <h2 id={`complete-the-fit-${context}`} className="min-w-0 text-2xl font-semibold tracking-[-0.04em] text-text-primary md:text-3xl">{data.title}</h2>
        <p className={`shrink-0 self-center text-center text-[9px] uppercase tracking-[0.16em] ${data.source === 'best_sellers' ? 'hot-selling-shine font-semibold' : 'text-text-muted'}`}>{data.source === 'manual' ? 'Curated' : data.source === 'frequently_bought_together' ? 'Bought together' : 'Hot selling'}</p>
      </div>

      {availableProducts.length ? <div className="mt-5 grid snap-x snap-mandatory auto-cols-[32%] grid-flow-col gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:auto-cols-auto md:grid-flow-row md:grid-cols-4 md:gap-3 md:overflow-visible md:px-7 [&::-webkit-scrollbar]:hidden">
        {availableProducts.slice(0, 8).map((product, index) => {
          const variants = sellableVariants(product);
          const price = Math.min(...variants.map((variant) => variant.price));
          const image = variants[0]?.images[0] ?? product.images[0];
          return <article key={product.id} className="min-w-0 snap-start">
            <div className="relative aspect-[4/5] overflow-hidden bg-background-elevated">
              <Link href={`/product/${product.slug}`} onClick={() => { if (context === 'drawer') closeCart(); }} className="absolute inset-0"><SafeImage src={image?.url ?? '/cruisin-image-fallback.svg'} alt={image?.alt ?? product.title} fill sizes="(max-width: 767px) 32vw, 20vw" className="object-cover" priority={context === 'drawer' && index === 0} /></Link>
              <button type="button" onClick={() => beginAdd(product)} aria-label="+ Add" className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/25 text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition duration-300 hover:scale-105 hover:border-accent-gold/70 hover:bg-black/40 hover:text-accent-gold"><Plus size={18} strokeWidth={1.5} /></button>
            </div>
            <Link href={`/product/${product.slug}`} onClick={() => { if (context === 'drawer') closeCart(); }} className="mt-2 block truncate text-xs font-medium text-text-primary">{product.title}</Link>
            <p className="mt-1 font-mono text-[11px] text-accent-gold">{formatPrice(Number.isFinite(price) ? price : product.basePrice)}</p>
          </article>;
        })}
      </div> : null}
      {data.bundleDiscount.enabled && milestoneSteps.length > 1 ? <div className="relative mt-5 overflow-hidden border-y border-accent-gold/20 bg-gradient-to-r from-[#b97845]/[0.08] via-transparent to-accent-gold/[0.08] px-5 py-3 md:px-7" role="progressbar" aria-label="Bundle saving progress" aria-valuemin={1} aria-valuemax={finalThreshold} aria-valuenow={Math.min(liveEligibleProductCount, finalThreshold)}>
        {unlockNotice ? <div className="pointer-events-none absolute inset-x-0 top-1 flex justify-around text-accent-gold" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} className="reward-sparkle" style={{ animationDelay: `${index * 70}ms` }}>✦</span>)}</div> : null}
        <div className="mb-2 text-center"><p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${unlockNotice ? 'text-success' : 'text-accent-gold'}`} aria-live="polite">{rewardHeadline}</p><p className="mt-0.5 text-[9px] leading-4 text-text-secondary">{rewardSupport}</p></div>
        <div className="relative">
          <div className="absolute left-[16.6667%] right-[16.6667%] top-2.5 h-0.5 -translate-y-1/2 bg-border-strong" />
          <div className="absolute left-[16.6667%] top-2.5 h-0.5 -translate-y-1/2 bg-accent-gold shadow-[0_0_10px_rgba(221,187,131,0.3)] transition-[width] duration-700 ease-out" style={{ width: `${milestoneProgress * (2 / 3)}%` }} />
          <div className={`relative grid ${milestoneSteps.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {milestoneSteps.map((step, index) => {
              const completed = step.threshold < currentMilestone;
              const active = step.threshold === currentMilestone;
              const next = step.threshold === currentMilestone + 1;
              const tierColor = index === 0 ? 'text-[#b97845]' : index === 1 ? 'text-[#c8cdd3]' : 'text-accent-gold';
              const stateColor = active ? 'text-accent-gold' : completed ? tierColor : next ? 'text-accent-gold/65' : 'text-text-muted';
              return <div key={step.threshold} className="min-w-0 text-center">
                <span className={`relative z-10 mx-auto grid h-5 w-5 place-items-center transition-all duration-500 ${stateColor} ${active ? 'scale-110 opacity-100 drop-shadow-[0_0_10px_currentColor]' : completed ? 'opacity-100' : next ? 'opacity-75' : 'opacity-35'}`}><Star size={17} strokeWidth={1.4} fill={active || completed ? 'currentColor' : 'var(--bg-primary)'} /></span>
                <p className={`mt-1.5 text-[9px] font-medium uppercase tracking-[0.14em] ${active ? 'text-text-primary' : 'text-text-muted'}`}>{step.label}</p>
                <p className={`mt-0.5 text-[10px] font-semibold transition-colors ${active || completed ? 'text-accent-gold' : 'text-text-secondary'}`}>{step.value}</p>
              </div>;
            })}
          </div>
        </div>
      </div> : null}
      {announcement ? <p className="px-5 pt-4 text-xs text-success md:px-7" role="status">{announcement}</p> : null}
    </section>

    <Dialog.Root open={Boolean(selectedProduct)} onOpenChange={(open) => { if (!open) closeQuickAdd(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[151] max-h-[88dvh] overflow-y-auto border-t border-border bg-background-elevated px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 shadow-lg md:left-1/2 md:w-[520px] md:-translate-x-1/2 md:border md:p-8">
          <div className="flex items-start justify-between gap-5">
            {selectedProduct ? <Link href={`/product/${selectedProduct.slug}`} onClick={() => { closeQuickAdd(); if (context === 'drawer') closeCart(); }} className="min-h-11 border-b border-accent-gold pt-2 text-sm text-text-primary">See full product details</Link> : <span />}
            <Dialog.Close className="grid h-11 w-11 shrink-0 place-items-center text-text-secondary outline-none transition hover:text-text-primary focus:outline-none focus-visible:outline-none" aria-label="Close quick add"><X size={28} strokeWidth={1.4} /></Dialog.Close>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(112px,32vw)_minmax(0,1fr)] items-start gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
            {selectedImages.length ? <div className="min-w-0">
              <div className="flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={`${selectedProduct?.title ?? 'Product'} photos`} onScroll={(event) => { const width = event.currentTarget.clientWidth; if (width > 0) setSelectedImageIndex(Math.round(event.currentTarget.scrollLeft / width)); }}>
                {selectedImages.map((image, index) => <div key={`${image.url}-${index}`} className="relative min-w-full snap-center overflow-hidden bg-background-primary"><SafeImage src={image.url} alt={image.alt || `${selectedProduct?.title ?? 'Product'} photo ${index + 1}`} fill sizes="(max-width: 767px) 32vw, 140px" className="object-cover" /></div>)}
              </div>
              {selectedImages.length > 1 ? <div className="mt-1.5 h-1 overflow-hidden bg-border-subtle" aria-hidden="true"><span className="block h-full bg-accent-gold transition-transform duration-300 ease-out" style={{ width: `${100 / selectedImages.length}%`, transform: `translateX(${selectedImageIndex * 100}%)` }} /></div> : null}
            </div> : <div className="aspect-[4/5] bg-background-primary" />}
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold leading-tight tracking-[-0.03em] text-text-primary md:text-2xl">{selectedProduct?.title}</Dialog.Title>
              <p className="mt-2 font-mono text-base text-accent-gold">{formatPrice(Number.isFinite(selectedPrice) ? selectedPrice : selectedProduct?.basePrice ?? 0)}</p>
              <p className="mt-4 text-xs text-text-primary">Color: <span className="text-text-secondary">{selectedColor}</span></p>
              <div className="mt-3 flex flex-wrap gap-3">{colors.map((color) => <button key={color.label} type="button" onClick={() => chooseColor(color.label)} aria-label={`Color ${color.label}`} aria-pressed={colorKey(selectedColor) === colorKey(color.label)} title={color.label} className={`grid h-10 w-10 place-items-center rounded-full border-2 transition duration-200 hover:scale-105 ${colorKey(selectedColor) === colorKey(color.label) ? 'border-accent-gold shadow-[0_0_14px_rgba(221,187,131,0.25)]' : 'border-border'}`}><span className="block h-7 w-7 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: color.hex }} /></button>)}</div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm text-text-primary">Size:</p>
            <div className="mt-2 flex flex-wrap gap-2">{variantsForColor.map((variant) => <button key={variant.id} type="button" disabled={variant.stock <= 0} aria-pressed={selectedVariant?.id === variant.id} onClick={() => setSelectedVariant(variant)} className={`grid h-11 min-w-12 place-items-center border px-3 text-xs font-medium transition ${selectedVariant?.id === variant.id ? 'border-accent-gold bg-accent-gold text-text-inverse' : variant.stock <= 0 ? 'cursor-not-allowed border-border bg-background-primary text-text-muted line-through opacity-50' : 'border-border bg-background-primary text-text-primary hover:border-accent-gold'}`}>{variant.size}</button>)}</div>
          </div>

          <button type="button" disabled={!selectedProduct || !selectedVariant || selectedVariant.stock <= 0} onClick={() => { if (selectedProduct && selectedVariant) addVariant(selectedProduct, selectedVariant); }} className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent-gold px-5 text-sm font-semibold text-text-inverse transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-background-primary disabled:text-text-muted">Add to Bag</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
