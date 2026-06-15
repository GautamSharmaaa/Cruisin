// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useArchiveProduct } from '@/hooks/useAdminMutations';
import { formatPrice } from '@/lib/utils';
import type { ProductDto } from '@/types/dto.types';

export interface ProductManagerProps {
  products: ProductDto[];
  isLoading: boolean;
}

const productId = (product: ProductDto): string => product.id ?? product._id ?? product.slug;
const productStock = (product: ProductDto): number => (product.variants ?? []).reduce((sum, variant) => sum + variant.stock, 0);

export function ProductManager({ products, isLoading }: ProductManagerProps): ReactNode {
  const archiveProduct = useArchiveProduct();
  const onArchive = (id: string): void => { if (window.confirm(COPY.common.confirmArchive)) archiveProduct.mutate(id); };
  if (!isLoading && products.length === 0) return <section className="grid gap-6"><div className="flex justify-end"><Link className="inline-flex h-11 items-center justify-center bg-accent-gold px-6 text-xs font-medium uppercase tracking-[0.08em] text-text-inverse transition hover:brightness-110 active:scale-[0.98]" href="/products/new">{COPY.products.new}</Link></div><EmptyPanel title={COPY.products.title} message={COPY.products.empty} /></section>;
  return <section className="grid gap-6"><div className="flex justify-end"><Link className="inline-flex h-11 items-center justify-center bg-accent-gold px-6 text-xs font-medium uppercase tracking-[0.08em] text-text-inverse transition hover:brightness-110 active:scale-[0.98]" href="/products/new">{COPY.products.new}</Link></div><div className="overflow-x-auto border border-border bg-background-elevated shadow-lg"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">{COPY.fields.title}</th><th className="border-b border-border p-4">{COPY.fields.slug}</th><th className="border-b border-border p-4">{COPY.table.price}</th><th className="border-b border-border p-4">{COPY.table.stock}</th><th className="border-b border-border p-4">{COPY.fields.status}</th><th className="border-b border-border p-4">{COPY.table.columns[3]}</th></tr></thead><tbody>{isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={6}>{COPY.common.loading}</td></tr> : products.map((product) => { const id = productId(product); const stock = productStock(product); return <tr key={id} className="border-b border-border-subtle transition hover:bg-background-overlay/60"><td className="p-4 text-text-primary"><p>{product.title}</p><p className="mt-1 text-xs text-text-muted">{product.variants?.[0]?.sku ?? COPY.common.none}</p></td><td className="p-4 text-text-secondary">{product.slug}</td><td className="p-4 font-mono text-accent-gold">{formatPrice(product.basePrice)}</td><td className="p-4 text-text-secondary">{stock}</td><td className="p-4"><StatusPill tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? COPY.table.active : COPY.table.inactive}</StatusPill></td><td className="flex gap-2 p-4"><Link className="inline-flex h-11 items-center justify-center border border-border px-6 text-xs font-medium uppercase tracking-[0.08em] text-text-primary transition hover:border-border-strong active:scale-[0.98]" href={'/products/' + id}>{COPY.table.edit}</Link><Button variant="danger" onClick={() => onArchive(id)} disabled={archiveProduct.isPending}>{COPY.common.archive}</Button></td></tr>; })}</tbody></table></div>{archiveProduct.isSuccess ? <p className="text-sm text-success">{COPY.products.archived}</p> : null}</section>;
}
