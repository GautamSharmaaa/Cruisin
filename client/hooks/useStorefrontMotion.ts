'use client';
import {useSyncExternalStore} from 'react';
const query='(prefers-reduced-motion: reduce)';
const subscribe=(notify:()=>void):(()=>void)=>{const media=window.matchMedia(query);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);};
const snapshot=():boolean=>window.matchMedia(query).matches;
// CSS keeps reduced-motion content still before hydration; subscribe to live preference changes.
export const useStorefrontReducedMotion=():boolean=>useSyncExternalStore(subscribe,snapshot,()=>false);
