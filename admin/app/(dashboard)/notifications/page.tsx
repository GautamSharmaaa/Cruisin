import { PageHeader } from '@/components/dashboard/page-header';
import { NotificationSettings } from '@/components/dashboard/notification-settings';

export default function NotificationsPage() {
  return <section className="grid gap-6">
    <PageHeader eyebrow="Administration" title="Notifications" subtitle="Choose who receives Cruisin operations alerts on WhatsApp." />
    <NotificationSettings />
  </section>;
}
