// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { BestSellers } from '@/components/home/best-sellers';
import { FeaturedCollections } from '@/components/home/featured-collections';
import { FlashSale } from '@/components/home/flash-sale';
import { HeroSection } from '@/components/home/hero-section';
import { InstagramSection } from '@/components/home/instagram-section';
import { NewArrivals } from '@/components/home/new-arrivals';
import { NewsletterSection } from '@/components/home/newsletter-section';

export default function HomePage(): ReactNode { return <><HeroSection /><FeaturedCollections /><FlashSale /><BestSellers /><NewArrivals /><InstagramSection /><NewsletterSection /></>; }
