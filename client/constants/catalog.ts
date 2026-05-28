// Governed by .rules v1.0
const imageBase = 'https://images.unsplash.com';

export const COLLECTIONS = [
  { title: 'Black Transit', href: '/shop?category=outerwear', image: { url: imageBase + '/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85', alt: 'Minimal black overshirt editorial', width: 1200, height: 1600 } },
  { title: 'Quiet Uniform', href: '/shop?category=tops', image: { url: imageBase + '/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85', alt: 'Luxury long sleeve editorial look', width: 1200, height: 1600 } },
  { title: 'Night Cargo', href: '/shop?category=bottoms', image: { url: imageBase + '/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85', alt: 'Editorial black cargo trousers', width: 1200, height: 1600 } }
] as const;
