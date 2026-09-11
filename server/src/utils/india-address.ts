// Governed by .rules v1.0

const INDIA_ALIASES = new Set(['in', 'ind', 'india']);

export const normalizeIndiaCountry = (value: string): string => {
  const country = value.trim();
  return INDIA_ALIASES.has(country.toLowerCase()) ? 'India' : country;
};

export const isIndiaCountry = (value: string): boolean => normalizeIndiaCountry(value) === 'India';
