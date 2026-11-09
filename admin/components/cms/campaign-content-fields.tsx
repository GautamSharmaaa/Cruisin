'use client';
import {useState,type ReactNode} from 'react';
import {Plus,Trash2,Upload} from 'lucide-react';
import {editorialPresentation} from '@cruisin/contracts/editorial';
import {uploadPublicMedia} from '@/lib/media-upload';
import {CMS_STUDIO_COPY as C} from '@/constants/cms-studio-copy';
import {Input} from '@/components/ui/input';
export interface CampaignContentFieldsProps {content:Record<string,unknown>;styles:Record<string,unknown>;onContent:(key:string,value:string)=>void;onStyles:(styles:Record<string,unknown>)=>void;}
export function CampaignContentFields({content,styles,onContent,onStyles}:CampaignContentFieldsProps):ReactNode{
 const presentation=editorialPresentation(styles.editorial??{});const raw=styles.editorial&&typeof styles.editorial==='object'?styles.editorial as Record<string,unknown>:{};const editable=Array.isArray(raw.buttons)?raw.buttons.filter((button):button is {label:string;href:string}=>Boolean(button&&typeof button==='object'&&typeof button.label==='string'&&typeof button.href==='string')):undefined;const buttons=editable??presentation.buttons??[{label:String(content.ctaText??'Shop now'),href:String(content.ctaLink??'/shop')}];
 const update=(next:{label:string;href:string}[]):void=>onStyles({...styles,editorial:{...presentation,...raw,buttons:next}});
 return <div className="cms-campaign-content"><MediaControl label={C.desktopImage} url={String(content.desktopMedia??content.posterImage??'')} onChange={url=>onContent('desktopMedia',url)}/><MediaControl label={C.mobileImage} url={String(content.mobileMedia??content.mobileFallbackImage??'')} onChange={url=>onContent('mobileMedia',url)}/><fieldset className="cms-button-editor"><legend>{C.buttons}</legend>{buttons.map((button,index)=><div className="cms-button-editor-row" key={index}><Input label={`${C.buttonLabel} ${index+1}`} value={button.label} onChange={event=>update(buttons.map((b,i)=>i===index?{...b,label:event.target.value}:b))}/><Input label={`${C.buttonDestination} ${index+1}`} list="cms-button-destinations" value={button.href} onChange={event=>update(buttons.map((b,i)=>i===index?{...b,href:event.target.value}:b))}/><button type="button" aria-label={`${C.remove} ${index+1}`} onClick={()=>update(buttons.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div>)}<datalist id="cms-button-destinations"><option value="/men"/><option value="/women"/><option value="/shop"/><option value="/collections"/></datalist>{buttons.length<3&&<button type="button" className="cms-studio-text-action" onClick={()=>update([...buttons,{label:buttons.length?'Shop Women':'Shop Men',href:buttons.length?'/women':'/men'}])}><Plus size={14}/>{C.addButton}</button>}</fieldset></div>;
}
export interface MediaControlProps {label:string;url:string;onChange:(url:string)=>void;}
export function MediaControl({label,url,onChange}:MediaControlProps):ReactNode{
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const previewUrl=url.startsWith('/')?new URL(url,process.env.NEXT_PUBLIC_STOREFRONT_URL??'http://127.0.0.1:3192').toString():url;
 const upload=async(file?:File):Promise<void>=>{if(!file)return;setBusy(true);setError('');try{onChange(await uploadPublicMedia(file));}catch(e){setError(e instanceof Error?e.message:C.uploadFailed);}finally{setBusy(false);}};
 return <fieldset className="cms-media-control"><legend>{label}</legend><div>{url&&<img src={previewUrl} alt={label} width="136" height="92"/>}<label className="cms-studio-upload"><Upload size={14}/>{busy?C.uploading:C.replace}<input aria-label={`${C.replace} ${label}`} type="file" accept="image/*" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label></div><details><summary>{C.imageUrl}</summary><Input label={`${label} ${C.imageUrl}`} value={url} onChange={e=>onChange(e.target.value)}/></details>{error&&<p role="alert">{error}</p>}</fieldset>;
}
