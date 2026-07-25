// Governed by .rules v1.0

export type ProductDescriptionBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

const isHeading = (line: string): boolean => {
  const letters = line.replace(/[^a-z]/gi, '');
  return letters.length > 0 && line.length <= 80 && line === line.toUpperCase();
};

export const parseProductDescription = (description: string): ProductDescriptionBlock[] => {
  const lines = description.split(/\r?\n/).map((line) => line.trim());
  const blocks: ProductDescriptionBlock[] = [];
  let listItems: string[] = [];

  const flushList = (): void => {
    if (!listItems.length) return;
    blocks.push({ type: 'list', items: listItems });
    listItems = [];
  };

  for (const line of lines) {
    if (!line) {
      flushList();
      continue;
    }

    const bullet = line.match(/^[-•]\s*(.+)$/);
    if (bullet?.[1]) {
      listItems.push(bullet[1]);
      continue;
    }

    flushList();
    blocks.push(isHeading(line) ? { type: 'heading', text: line } : { type: 'paragraph', text: line });
  }

  flushList();
  return blocks;
};

export const normalizeProductHighlights = (highlights: string[]): string[] => highlights
  .flatMap((highlight) => highlight.split(/\r?\n|(?<=[a-z0-9])(?=[A-Z])/))
  .map((highlight) => highlight.replace(/^[-•]\s*/, '').trim())
  .filter(Boolean);
