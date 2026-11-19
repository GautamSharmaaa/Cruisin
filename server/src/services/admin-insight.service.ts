// Governed by .rules v1.0
import { z } from 'zod';
import { AdminService } from './admin.service.js';

export const overviewPresetSchema = z.enum(['today', 'thisWeek', 'thisMonth', 'thisYear']);

const responseSchema = z.object({
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional()
  }))
});

export async function generateAdminInsight(preset: z.infer<typeof overviewPresetSchema>): Promise<{ text: string; source: 'live' | 'ai' }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_ADMIN_INSIGHTS_MODEL?.trim();

  const { summary, comparison, inventory, outstanding } = await AdminService.analyticsSummary({ preset });
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const live = {
    source: 'live' as const,
    text: `${summary.totalOrders} orders, ${summary.unitsSold} units sold and ${money.format(summary.netRevenue)} in paid value for this period. ${outstanding.cod > 0
      ? `${money.format(outstanding.cod)} is still due on COD orders.`
      : `${inventory.outOfStock} products are out of stock and ${inventory.lowStock} are low on stock.`}`,
  };
  if (!key || !model) return live;

  try {
    const measures = (data: typeof summary) => ({
      orders: data.totalOrders,
      paidOrders: data.paidOrders,
      paidValue: data.netRevenue,
      unitsSold: data.unitsSold,
      refunds: data.refunds
    });
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 384,
        instructions: 'Summarize this retail dashboard in at most two plain-text sentences. Use only the supplied anonymous aggregate data. Compare to the previous equivalent period when supported. Currency is INR. Give one practical observation. Do not infer causes or invent figures. Do not use headings or markup.',
        input: JSON.stringify({
          period: preset,
          current: measures(summary),
          previous: measures(comparison.summary),
          pendingCod: outstanding.cod,
          lowStockProducts: inventory.lowStock,
          outOfStockProducts: inventory.outOfStock
        })
      })
    });
    if (!response.ok) throw new Error('AI insights provider unavailable');
    const parsed = responseSchema.parse(await response.json());
    const text = parsed.output.filter(item => item.type === 'message')
      .flatMap(item => item.content ?? [])
      .filter(part => part.type === 'output_text')
      .map(part => part.text ?? '').join(' ').trim();
    if (!text) throw new Error('AI insights provider returned no text');
    return { text: text.slice(0, 600), source: 'ai' };
  } catch {
    return live;
  }
}
