import { describe, expect, it } from 'vitest';
import { normalizeProductHighlights, parseProductDescription } from '@/lib/product-description';

describe('parseProductDescription', () => {
  it('preserves admin headings, paragraphs, and bullet groups', () => {
    expect(parseProductDescription([
      'PERFORMANCE 2-IN-1 DESIGN',
      '',
      'Built for demanding training sessions.',
      '',
      'KEY FEATURES',
      '',
      '- Lightweight construction',
      '- Secure zip pockets'
    ].join('\n'))).toEqual([
      { type: 'heading', text: 'PERFORMANCE 2-IN-1 DESIGN' },
      { type: 'paragraph', text: 'Built for demanding training sessions.' },
      { type: 'heading', text: 'KEY FEATURES' },
      { type: 'list', items: ['Lightweight construction', 'Secure zip pockets'] }
    ]);
  });

  it('repairs concatenated highlights returned by legacy product data', () => {
    expect(normalizeProductHighlights(['2-in-1 constructionSecure zip pocketsLaser-cut ventilation'])).toEqual([
      '2-in-1 construction',
      'Secure zip pockets',
      'Laser-cut ventilation'
    ]);
  });
});
