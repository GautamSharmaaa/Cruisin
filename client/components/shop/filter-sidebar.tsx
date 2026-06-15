// Governed by .rules v1.0
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export interface FilterSidebarProps { activeCount: number; className?: string; }
export function FilterSidebar({ activeCount, className }: FilterSidebarProps): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentSize = searchParams.get('size') ?? '';
  const currentColor = searchParams.get('color') ?? '';

  const toggleFilter = (key: 'size' | 'color', value: string): void => {
    const next = new URLSearchParams(searchParams.toString());
    const currentValue = next.get(key);
    if (currentValue === value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.push(pathname + '?' + next.toString());
  };

  return (
    <aside className={className ?? "hidden w-72 shrink-0 border-r border-border-subtle p-6 lg:block"}>
      <h2 className="font-display text-xl">
        {COPY.shop.filters} {activeCount > 0 ? '(' + activeCount + ')' : ''}
      </h2>
      <div className="mt-8 space-y-8">
        <section>
          <h3 className="font-accent text-xs uppercase tracking-[0.15em] text-text-secondary">
            {COPY.product.size}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {COPY.filters.sizes.map((size) => {
              const isActive = currentSize === size;
              return (
                <button
                  key={size}
                  onClick={() => toggleFilter('size', size)}
                  className={`h-10 min-w-10 border px-3 text-sm transition-colors duration-200 ${
                    isActive
                      ? 'border-accent-gold text-accent-gold bg-accent-gold/5 font-semibold'
                      : 'border-border text-text-secondary hover:text-text-primary hover:border-border-strong'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h3 className="font-accent text-xs uppercase tracking-[0.15em] text-text-secondary">
            {COPY.product.color}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {COPY.filters.colors.map((color) => {
              const isActive = currentColor === color;
              return (
                <button
                  key={color}
                  onClick={() => toggleFilter('color', color)}
                  className={`h-10 border px-3 text-sm transition-colors duration-200 ${
                    isActive
                      ? 'border-accent-gold text-accent-gold bg-accent-gold/5 font-semibold'
                      : 'border-border text-text-secondary hover:text-text-primary hover:border-border-strong'
                  }`}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
