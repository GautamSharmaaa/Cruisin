// Governed by .rules v1.0
import { cache, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsHomepage } from '@/components/home/cms-homepage';
import { loadPublishedCmsPage } from '@/components/home/published-cms-sections';

export const dynamic = 'force-dynamic';
const loadPage = cache(loadPublishedCmsPage);
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cms = await loadPage(slug);
  if (!cms?.page) return {};
  return { title: cms.page.seoTitle || cms.page.title, description: cms.page.seoDescription, alternates: { canonical: '/pages/' + encodeURIComponent(slug) } };
}

export default async function PublishedPage({ params }: PageProps): Promise<ReactNode> {
  const { slug } = await params;
  const cms = await loadPage(slug);
  if (!cms?.page || !cms.sections.length) notFound();
  return <main aria-label={cms.page.title}><CmsHomepage sections={cms.sections} /></main>;
}
