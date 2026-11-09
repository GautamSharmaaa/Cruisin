import type {z} from 'zod';
export interface OrbitCard {label:string;image:string;href:string;}
export interface OrbitCardsConfiguration {cards:OrbitCard[];autoplay:boolean;mouseControl:boolean;cycleSeconds:number;}
export const orbitCardSchema:z.ZodType<OrbitCard>;
export const orbitCardsSchema:z.ZodType<OrbitCardsConfiguration>;
export const DEFAULT_ORBIT_CONTENT:{cards:string;autoplay:boolean;mouseControl:boolean;cycleSeconds:number;};
export function readOrbitContent(content:Record<string,unknown>):OrbitCardsConfiguration|null;
