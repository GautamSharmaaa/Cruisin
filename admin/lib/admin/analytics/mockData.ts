// Governed by .rules v1.0
export type AnalyticsTabKey = 'order' | 'website' | 'products';

export interface AnalyticsFilters {
  period: 'Day' | 'Week' | 'Month';
  dateRange: string;
  extra: string;
}

export interface TrendPoint {
  label: string;
  [key: string]: string | number;
}

export interface MetricPoint {
  label: string;
  value: string;
  detail?: string;
  tone?: 'neutral' | 'success' | 'danger' | 'info' | 'gold';
}

export interface DistributionPoint {
  label: string;
  value: number;
  percent?: number;
}

export interface TableData {
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface ProductInsightCard {
  name: string;
  contribution: number;
  orders: number;
  sku: string;
  category: string;
  tone: string;
}

export interface ProductTableRow {
  productName: string;
  sku: string;
  category: string;
  orders: number;
  revenue: number;
  rto: string;
  returns: string;
  conversion: string;
  stockStatus: string;
}

const weekLabels = ['18-24 May', '25-31 May', '1-7 Jun', '8-14 Jun'];
const dayLabels = ['11 Jun', '12 Jun', '13 Jun', '14 Jun', '15 Jun', '16 Jun', '17 Jun'];
const hourLabels = Array.from({ length: 24 }, (_, index) => String(index));

export const orderAnalytics = {
  refreshedAt: 'Last refreshed on 4:30AM, Today',
  filters: {
    period: 'Week',
    dateRange: '18-05-2026 - 14-06-2026',
    extra: 'Payment Mode'
  } satisfies AnalyticsFilters,
  orderTrend: weekLabels.map((label, index) => ({ label, confirmed: [17, 34, 50, 64][index], total: [18, 36, 53, 65][index] })),
  revenueTrend: weekLabels.map((label, index) => ({ label, confirmedRevenue: [21000, 38000, 54000, 68000][index], totalRevenue: [22500, 39500, 57000, 69500][index] })),
  details: [
    { label: 'Confirmed Orders', value: '165', tone: 'gold' },
    { label: 'Orders in PPH', value: '1', detail: '1%', tone: 'info' },
    { label: 'Orders In-Transit', value: '42', detail: '25%', tone: 'info' },
    { label: 'Orders Delivered', value: '58', detail: '35%', tone: 'success' },
    { label: 'Orders RTOed', value: '64', detail: '39%', tone: 'danger' },
    { label: 'Orders Lost', value: '0', detail: '0%', tone: 'danger' }
  ] satisfies MetricPoint[],
  detailsTable: {
    columns: ['Date', 'Orders Placed', 'Cancelled', 'Confirmed Orders', 'PPH', 'In-Transit', 'Orders Delivered', 'RTO', 'Orders Lost/Damaged'],
    rows: [
      ['8-14 Jun', 65, '1 / 2%', 64, '1 / 2%', '36 / 56%', '13 / 20%', '14 / 22%', '0 / 0%'],
      ['1-7 Jun', 53, '3 / 6%', 50, '0 / 0%', '5 / 10%', '25 / 50%', '20 / 40%', '0 / 0%'],
      ['25-31 May', 36, '2 / 6%', 34, '0 / 0%', '1 / 3%', '17 / 50%', '16 / 47%', '0 / 0%'],
      ['18-24 May', 18, '1 / 6%', 17, '0 / 0%', '0 / 0%', '3 / 18%', '14 / 82%', '0 / 0%']
    ]
  } satisfies TableData,
  paymentModes: [
    { label: 'COD', value: 83 },
    { label: 'Online', value: 15 },
    { label: 'Partial-COD', value: 2 }
  ],
  states: [
    { label: 'Uttar Pradesh', value: 13 },
    { label: 'Maharashtra', value: 10 },
    { label: 'Karnataka', value: 7 },
    { label: 'Delhi NCR', value: 3 },
    { label: 'Gujarat', value: 2 }
  ],
  tiers: [
    { label: 'Tier 3', value: 107 },
    { label: 'Tier 1', value: 31 },
    { label: 'Metro', value: 23 },
    { label: 'Tier 2', value: 11 }
  ],
  topCities: {
    columns: ['City Name', 'Order Count', 'Volume %'],
    rows: [
      ['Delhi', 10, '6%'],
      ['Bangalore', 8, '5%'],
      ['Hyderabad', 6, '3%'],
      ['Chennai', 4, '2%'],
      ['Gurgaon', 4, '2%'],
      ['Thane', 2, '1%'],
      ['Pune', 2, '1%'],
      ['Mumbai', 2, '1%']
    ]
  } satisfies TableData,
  topProducts: {
    columns: ['Top 10 Products', 'Order Count', 'Volume %'],
    rows: [
      ['Dark Grey Polyester Slim Tapered Fit', 142, '83%'],
      ['Olive Polyester Slim Tapered Fit', 13, '8%'],
      ['Black Polyester Slim Tapered Fit', 8, '5%'],
      ['Light Grey Woven Tapered Jogger', 3, '2%'],
      ['Light Grey Ribstop Modern Fit', 1, '1%'],
      ['Yellow Polyester Athletic Fit', 1, '1%']
    ]
  } satisfies TableData,
  aovTrend: weekLabels.map((label, index) => ({ label, placed: [1420, 1110, 1180, 1135][index], delivered: [1180, 950, 1055, 960][index] })),
  paymentSummary: {
    columns: ['Order Date', 'Order Placed', 'Order Cancelled', 'Dispatched Order', 'Delivered Order', 'RTO Order', 'Cash Amount Received', 'Online Payment Received'],
    rows: [
      ['Today', 7, 1, 9, 5, 2, 3972, 90],
      ['Yesterday', 8, 0, 10, 0, 1, 0, 0],
      ['Tue, 16 Jun, 26', 7, 1, 3, 0, 7, 0, 90],
      ['Mon, 15 Jun, 26', 15, 1, 29, 3, 4, 1099, 0],
      ['Sun, 14 Jun, 26', 14, 0, 0, 2, 2, 1099, 949],
      ['Sat, 13 Jun, 26', 9, 1, 0, 6, 3, 3726, 0],
      ['Fri, 12 Jun, 26', 1, 0, 8, 3, 3, 2198, 0]
    ]
  } satisfies TableData
};

export const websiteAnalytics = {
  refreshedAt: 'Last refreshed on 4:30AM, Today',
  filters: {
    period: 'Day',
    dateRange: 'Jun 11 - Jun 17, 2026',
    extra: 'Traffic Source'
  } satisfies AnalyticsFilters,
  kpis: [
    { label: 'Visitors', value: '2,556', tone: 'gold' },
    { label: 'Sessions', value: '2,806', tone: 'gold' },
    { label: 'Average Sessions per Visitor', value: '1.1', tone: 'neutral' },
    { label: 'Average Sessions per Buyer', value: '1.08', tone: 'neutral' },
    { label: 'Bounce Rate', value: '38%', tone: 'danger' }
  ] satisfies MetricPoint[],
  trafficTrend: dayLabels.map((label, index) => ({
    label,
    sessions: [395, 125, 510, 470, 600, 490, 450][index],
    visitors: [360, 110, 475, 430, 545, 425, 415][index],
    bounce: [0.45, 0.18, 0.58, 0.44, 0.64, 0.49, 0.52][index]
  })),
  funnel: [
    { label: 'Website Landing', value: 2895, percent: 100 },
    { label: 'Clicks Buy Now', value: 352, percent: 12 },
    { label: 'Payment Initiated', value: 112, percent: 3.9 },
    { label: 'Purchased', value: 64, percent: 2.4 }
  ] satisfies DistributionPoint[],
  funnelTrend: dayLabels.map((label, index) => ({
    label,
    clickBuyNow: [13.6, 5.8, 11.2, 16.2, 12.1, 9.8, 13.2][index],
    paymentInitiated: [5.4, 1.9, 3.2, 5.1, 4.0, 3.1, 3.7][index],
    purchased: [2.9, 1.0, 2.0, 3.3, 2.8, 1.8, 2.1][index]
  })),
  deviceTypes: [
    { label: 'Mobile', value: 94 },
    { label: 'Desktop', value: 6 }
  ],
  pages: [
    { label: '/product page', value: 5350 },
    { label: '/home page', value: 160 },
    { label: '/collection page', value: 120 },
    { label: '/order page', value: 35 }
  ],
  trafficSources: [
    { label: 'Facebook', value: 2630 },
    { label: 'Others', value: 300 },
    { label: 'Google', value: 85 },
    { label: 'WA Retargeting', value: 25 },
    { label: 'WA Bumper', value: 18 }
  ],
  gender: [
    { label: 'Male', clicks: 93, orders: 95 },
    { label: 'Female', clicks: 6, orders: 4 },
    { label: 'Unknown', clicks: 1, orders: 1 }
  ],
  browsers: [
    { label: 'Chrome', value: 2520 },
    { label: 'Safari', value: 265 },
    { label: 'Other', value: 72 },
    { label: 'Microsoft Edge', value: 58 },
    { label: 'Google Search', value: 12 }
  ],
  age: [
    { label: '18-24', clicks: 4, orders: 2 },
    { label: '25-34', clicks: 39, orders: 41 },
    { label: '35-44', clicks: 37, orders: 31 },
    { label: '45-54', clicks: 15, orders: 16 },
    { label: '55-64', clicks: 4, orders: 8 },
    { label: '65+', clicks: 1, orders: 2 }
  ],
  pageOpens: [
    { label: '/product page', value: 1.84 },
    { label: '/home page', value: 0.05 },
    { label: '/collection page', value: 0.04 },
    { label: '/order page', value: 0.01 }
  ],
  bounceSources: [
    { label: 'WA Retargeting', value: 86 },
    { label: 'Google', value: 85 },
    { label: 'Others', value: 71 },
    { label: 'Facebook', value: 35 },
    { label: 'WA Bumper', value: 29 }
  ],
  cartProducts: [
    { label: '1', value: 100 },
    { label: '2', value: 0 },
    { label: '3', value: 0 },
    { label: '4+', value: 0 }
  ],
  hourlyTrend: hourLabels.map((label, index) => ({
    label,
    productVisitors: [118, 76, 36, 33, 18, 17, 62, 104, 106, 101, 136, 119, 117, 131, 124, 134, 146, 137, 139, 195, 180, 190, 168, 126][index],
    orders: [2, 0, 0, 2, 0, 0, 1, 2, 5, 3, 0, 3, 9, 4, 1, 5, 3, 2, 4, 5, 4, 4, 6, 4][index]
  }))
};

export const productAnalytics = {
  refreshedAt: 'Last refreshed on 4:30AM, Today',
  filters: {
    period: 'Week',
    dateRange: 'May 18 - Jun 14, 2026',
    extra: 'Category / Product'
  } satisfies AnalyticsFilters,
  topProducts: [
    { name: 'Dark Grey Polyester Slim Tapered Fit', contribution: 82.6, orders: 142, sku: 'Cruisin106-DG', category: 'Track Pants Joggers', tone: '#3f3f46' },
    { name: 'Olive Polyester Slim Tapered Fit', contribution: 7.6, orders: 13, sku: 'Cruisin106-OL', category: 'Track Pants Joggers', tone: '#656d4a' },
    { name: 'Black Polyester Slim Tapered Fit', contribution: 4.7, orders: 8, sku: 'Cruisin106-BK', category: 'Track Pants Joggers', tone: '#151515' },
    { name: 'Light Grey Woven Tapered Jogger', contribution: 1.7, orders: 3, sku: 'Cruisin105-LG', category: 'Track Pants Joggers', tone: '#b8b8b8' },
    { name: 'Light Grey Polyester Slim Tapered Fit', contribution: 0.6, orders: 1, sku: 'Cruisin106-LG', category: 'Track Pants Joggers', tone: '#9ca3af' }
  ] satisfies ProductInsightCard[],
  quality: [{ label: 'Track Pants Joggers', value: 4.7 }],
  orderCount: [
    { label: 'Track Pants Joggers', value: 167 },
    { label: 'Shorts', value: 3 },
    { label: 'Pants', value: 1 },
    { label: 'Puja Articles', value: 1 }
  ],
  rto: [
    { label: 'Pants', value: 100 },
    { label: 'Track Pants Joggers', value: 39 }
  ],
  websiteFunnel: [
    { label: 'Landing', value: 2895, percent: 100 },
    { label: 'Buy Now', value: 352, percent: 12 },
    { label: 'Payment', value: 112, percent: 3.9 },
    { label: 'Purchased', value: 64, percent: 2.4 }
  ],
  marketingSpend: [
    { label: 'Track Pants Joggers', value: 86 },
    { label: 'Shorts', value: 9 },
    { label: 'Pants', value: 5 }
  ],
  returns: [
    { label: 'Track Pants Joggers', value: 5 },
    { label: 'Pants', value: 0 },
    { label: 'Shorts', value: 0 }
  ],
  productTable: [
    { productName: 'Dark Grey Polyester Slim Tapered Fit', sku: 'Cruisin106-DG', category: 'Track Pants Joggers', orders: 142, revenue: 158090, rto: '22%', returns: '4%', conversion: '2.4%', stockStatus: 'In stock' },
    { productName: 'Olive Polyester Slim Tapered Fit', sku: 'Cruisin106-OL', category: 'Track Pants Joggers', orders: 13, revenue: 14487, rto: '40%', returns: '0%', conversion: '0.8%', stockStatus: 'Low stock' },
    { productName: 'Black Polyester Slim Tapered Fit', sku: 'Cruisin106-BK', category: 'Track Pants Joggers', orders: 8, revenue: 8792, rto: '47%', returns: '2%', conversion: '0.5%', stockStatus: 'In stock' },
    { productName: 'Light Grey Woven Tapered Jogger', sku: 'Cruisin105-LG', category: 'Track Pants Joggers', orders: 3, revenue: 3297, rto: '18%', returns: '0%', conversion: '0.2%', stockStatus: 'Low stock' },
    { productName: 'Light Grey Polyester Slim Tapered Fit', sku: 'Cruisin106-LG', category: 'Track Pants Joggers', orders: 1, revenue: 1099, rto: '0%', returns: '0%', conversion: '0.1%', stockStatus: 'Watch' }
  ] satisfies ProductTableRow[]
};

export const getOrderAnalytics = async (_filters: AnalyticsFilters): Promise<typeof orderAnalytics> => Promise.resolve(orderAnalytics);
export const getWebsiteAnalytics = async (_filters: AnalyticsFilters): Promise<typeof websiteAnalytics> => Promise.resolve(websiteAnalytics);
export const getProductAnalytics = async (_filters: AnalyticsFilters): Promise<typeof productAnalytics> => Promise.resolve(productAnalytics);
