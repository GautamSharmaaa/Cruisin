'use client';
import React, {type ReactNode} from 'react';
import {useStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {EXPERIENCE_COPY as C} from '@/constants/experience-copy';
import {experienceMotion} from '@/lib/animations';
import type {CSSProperties} from 'react';
export interface BrandLoaderProps {}
export function BrandLoader(_props:BrandLoaderProps):ReactNode{const settings=useStorefrontExperience();return <main className="brand-loading-surface" role="status" aria-live="polite" style={{'--loader-duration':(settings.motionPace==='quick'?experienceMotion.loaderQuickMs:experienceMotion.loaderMs)+'ms'} as CSSProperties}>{settings.pageLoader==='brand'&&<svg className="brand-loading-symbol" viewBox="0 0 64 64" aria-hidden="true"><path d="m32 8 24 24-24 24L8 32Z"/><path d="m32 20 12 12-12 12-12-12Z"/><path d="M32 8v12M56 32H44M32 56V44M8 32h12"/></svg>}<span>{C.loading}</span></main>;}
