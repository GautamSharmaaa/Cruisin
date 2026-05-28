// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
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
  return <section className="grid gap-6"><div className="flex items-center justify-between"><h1 className="font-display text-3xl">{COPY.products.title}</h1><Link className="inline-flex h-11 items-center justify-center bg-accent-gold px-6 text-xs font-medium uppercase tracking-[0.08em] text-text-inverse transition hover:brightness-110 active:scale-[0.98]" href="/products/new">{COPY.products.new}</Link></div><div className="overflow-x-auto border border-border bg-background-elevated"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">{COPY.fields.title}</th><th className="border-b border-border p-4">{COPY.fields.slug}</th><th className="border-b border-border p-4">{COPY.table.price}</th><th className="border-b border-border p-4">{COPY.table.stock}</th><th className="border-b border-border p-4">{COPY.fields.status}</th><th className="border-b border-border p-4">{COPY.table.columns[3]}</th></tr></thead><tbody>{isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={6}>{COPY.common.loading}</td></tr> : products.map((product) => { const id = productId(product); return <tr key={id} className="border-b border-border-subtle"><td className="p-4 text-text-primary">{product.title}</td><td className="p-4 text-text-secondary">{product.slug}</td><td className="p-4 font-mono text-accent-gold">{formatPrice(product.basePrice)}</td><td className="p-4 text-text-secondary">{productStock(product)}</td><td className="p-4 text-text-secondary">{product.isActive ? COPY.table.active : COPY.table.inactive}</td><td className="flex gap-2 p-4"><Link className="inline-flex h-11 items-center justify-center border border-border px-6 text-xs font-medium uppercase tracking-[0.08em] text-text-primary transition hover:border-border-strong active:scale-[0.98]" href={'/products/' + id}>{COPY.table.edit}</Link><Button variant="danger" onClick={() => onArchive(id)} disabled={archiveProduct.isPending}>{COPY.common.archive}</Button></td></tr>; })}</tbody></table></div>{archiveProduct.isSuccess ? <p className="text-sm text-success">{COPY.products.archived}</p> : null}</section>;
}
