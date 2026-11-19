import { collectionFilterGroups, type StorefrontExperience } from '@cruisin/contracts/storefront-experience';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { COLLECTION_EXPERIENCE_COPY as C } from '@/constants/storefront-experience-copy';

interface LoadingCollectionFieldsProps {
  section: 'both' | 'loader' | 'collections';
  value: StorefrontExperience;
  change: <K extends keyof StorefrontExperience>(key: K, value: StorefrontExperience[K]) => void;
}

const inputClass = 'h-12 border border-border bg-background-primary px-3';

export function LoadingCollectionFields({ section, value, change }: LoadingCollectionFieldsProps): ReactNode {
  return <>
    {section !== 'collections' && <fieldset className="grid gap-4 border border-border p-4 sm:grid-cols-2">
      <legend className="px-2 font-semibold">{C.loader}</legend>
      <label className="grid gap-2 text-sm">{C.mark}
        <select className={inputClass} value={value.loaderMark} onChange={event => change('loaderMark', event.target.value === 'diamond' ? 'diamond' : 'wordmark')}>
          <option value="wordmark">{C.wordmark}</option><option value="diamond">{C.diamond}</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm">{C.tone}
        <select className={inputClass} value={value.loaderTone} onChange={event => {
          const tone = event.target.value;
          change('loaderTone', tone === 'light' || tone === 'dark' ? tone : 'theme');
        }}>
          <option value="theme">{C.theme}</option><option value="light">{C.light}</option><option value="dark">{C.dark}</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm">{C.text}
        <input className={inputClass} maxLength={60} value={value.loaderText} onChange={event => change('loaderText', event.target.value)} />
      </label>
      <div className="flex items-end gap-4">
        <label className="grid gap-2 text-sm">{C.accent}
          <input className="h-12 w-20 border border-border bg-background-primary p-1" type="color" value={value.loaderAccent ?? '#c7a881'} onChange={event => change('loaderAccent', event.target.value)} />
        </label>
        {value.loaderAccent && <button type="button" className="min-h-12 underline" onClick={() => change('loaderAccent', undefined)}>{C.defaultAccent}</button>}
      </div>
    </fieldset>}
    {section !== 'loader' && <fieldset className="grid gap-4 border border-border p-4">
      <legend className="px-2 font-semibold">{C.collections}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {([['collectionAutoLoad', C.autoLoad], ['collectionSortVisible', C.sort], ['collectionWindowVisible', C.window]] as const).map(([key, label]) =>
          <label className="flex min-h-10 items-center gap-2" key={key}><input type="checkbox" checked={value[key]} onChange={event => change(key, event.target.checked)} />{label}</label>)}
      </div>
      <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold">{C.groups}</legend>
        {collectionFilterGroups.map(group =>
          <label className="flex min-h-10 items-center gap-2 text-sm" key={group}>
            <input type="checkbox" checked={value.collectionFilters.includes(group)} onChange={event =>
              change('collectionFilters', event.target.checked ? [...value.collectionFilters, group] : value.collectionFilters.filter(item => item !== group))} />{C.groupLabels[group]}
          </label>)}
      </fieldset>
      <Link href="/cms/navigation" className="text-sm underline">{C.categoryLinks}</Link>
      <Link href="/storefront?panel=pages" className="text-sm underline">{C.pageSettings}</Link>
    </fieldset>}
  </>;
}
