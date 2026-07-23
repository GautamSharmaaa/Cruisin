export const MAX_VARIANT_IMAGES = 24;

export interface VariantWithOrderedImages {
  color: string;
  images: string[];
}

export const parseOrderedImageUrls = (value: string): string[] => {
  const urls = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(urls)).slice(0, MAX_VARIANT_IMAGES);
};

export const moveOrderedImage = (images: string[], from: number, to: number): string[] => {
  if (from < 0 || from >= images.length || to < 0 || to >= images.length || from === to) return [...images];
  const next = [...images];
  const [image] = next.splice(from, 1);
  next.splice(to, 0, image);
  return next;
};

export const appendOrderedUploads = (existing: string[], uploaded: string[], inheritedFallbacks: string[] = []): string[] => {
  const fallbackSet = new Set(inheritedFallbacks.filter(Boolean));
  const retained = existing.length === 1 && fallbackSet.has(existing[0]) ? [] : existing;
  return [...retained, ...uploaded].slice(0, MAX_VARIANT_IMAGES);
};

export const setOrderedImagesForColor = <TVariant extends VariantWithOrderedImages>(
  variants: TVariant[],
  color: string,
  images: string[]
): TVariant[] => {
  const normalizedColor = color.trim().toLowerCase();
  return variants.map((variant) => variant.color.trim().toLowerCase() === normalizedColor
    ? { ...variant, images: [...images] }
    : variant);
};
