'use client';
import {createContext,createElement,useContext,useMemo,type ReactNode} from 'react';
import {storefrontExperienceSchema,DEFAULT_STOREFRONT_EXPERIENCE,type StorefrontExperience} from '@cruisin/contracts/storefront-experience';
import {useSiteSettings} from './useMerchandising';
const ExperienceContext=createContext(DEFAULT_STOREFRONT_EXPERIENCE);
export interface StorefrontExperienceProviderProps {children:ReactNode;}
export function StorefrontExperienceProvider({children}:StorefrontExperienceProviderProps):ReactNode{
 const settings=useSiteSettings();
 const value=useMemo(()=>{const parsed=storefrontExperienceSchema.safeParse(settings.data?.storefrontExperience??{});return parsed.success?parsed.data:DEFAULT_STOREFRONT_EXPERIENCE;},[settings.data?.storefrontExperience]);
 return createElement(ExperienceContext.Provider,{value},children);
}
export function useStorefrontExperience():StorefrontExperience{return useContext(ExperienceContext);}
