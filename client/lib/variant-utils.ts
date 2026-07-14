export const isValidColorHex = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value);

export const swatchBackground = (value: string): string => isValidColorHex(value) ? value : 'repeating-linear-gradient(135deg, #202020 0 5px, #777 5px 10px)';

const namedSizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', '5XL'];
const normalizedSize = (value: string): string => value.trim().toUpperCase().replace(/^([2-5])X$/, '$1XL');

export const compareSizes = (left: string, right: string): number => {
  const leftValue = normalizedSize(left);
  const rightValue = normalizedSize(right);
  const leftRank = namedSizeOrder.indexOf(leftValue);
  const rightRank = namedSizeOrder.indexOf(rightValue);
  if (leftRank >= 0 || rightRank >= 0) return (leftRank < 0 ? namedSizeOrder.length : leftRank) - (rightRank < 0 ? namedSizeOrder.length : rightRank);
  return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
};

export const uniqueVariantsBySize = <TVariant extends { size: string }>(variants: TVariant[]): TVariant[] => Array.from(new Map(variants.map((variant) => [variant.size.trim().toLowerCase(), variant])).values()).sort((left, right) => compareSizes(left.size, right.size));

export interface CardVariantSelection<TVariant> {
  display: TVariant | undefined;
  purchasable: TVariant | undefined;
}

export const selectCardVariant = <TVariant extends { color: string; size: string; stock: number; enabled?: boolean }>(
  variants: TVariant[],
  preferredColor?: string,
  preferredSize?: string
): CardVariantSelection<TVariant> => {
  const enabled = variants.filter((variant) => variant.enabled !== false);
  const color = preferredColor?.trim().toLowerCase();
  const size = preferredSize?.trim().toLowerCase();
  const matches = (variant: TVariant): boolean => (!color || variant.color.trim().toLowerCase() === color) && (!size || variant.size.trim().toLowerCase() === size);
  const preferred = enabled.filter(matches);
  const display = preferred.find((variant) => variant.stock > 0) ?? preferred[0] ?? (!color && !size ? enabled.find((variant) => variant.stock > 0) ?? enabled[0] : undefined);
  return { display, purchasable: display?.stock && display.stock > 0 ? display : undefined };
};
