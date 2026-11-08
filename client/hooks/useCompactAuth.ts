'use client';
import {useSyncExternalStore} from 'react';
import {compactAuthQuery} from '@/lib/auth-presentation';
const subscribe=(notify:()=>void):(()=>void)=>{const media=window.matchMedia(compactAuthQuery);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);};
const snapshot=():boolean=>window.matchMedia(compactAuthQuery).matches;
export const useCompactAuth=():boolean=>useSyncExternalStore(subscribe,snapshot,()=>false);
