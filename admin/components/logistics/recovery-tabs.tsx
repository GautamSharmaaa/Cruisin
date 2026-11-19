import Link from 'next/link';

export function RecoveryTabs({ current }: { current: 'ndr' | 'rto' }) {
  return <nav aria-label="Delivery recovery queues" className="flex flex-wrap gap-2">
    <Link href="/logistics/ndr" aria-current={current === 'ndr' ? 'page' : undefined} className={'workspace-widget-action ' + (current === 'ndr' ? 'workspace-widget-primary' : '')}>NDR · Failed delivery</Link>
    <Link href="/logistics/rto" aria-current={current === 'rto' ? 'page' : undefined} className={'workspace-widget-action ' + (current === 'rto' ? 'workspace-widget-primary' : '')}>RTO · Return to origin</Link>
  </nav>;
}
