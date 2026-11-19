'use client';
import {EXPERIENCE_COPY as X} from '@/constants/storefront-experience-copy';
import type { SectionSuggestion } from './section-suggestions';
import {useState,type ReactNode} from 'react';
import {useDraggable,useDroppable} from '@dnd-kit/core';
import {ArrowDown,ArrowUp,ChevronDown,Copy,Eye,EyeOff,GripVertical,History,Monitor,Plus,RefreshCw,Settings2,Smartphone,Trash2} from 'lucide-react';
import {StorefrontPreview} from './storefront-preview';
import {CMS_STUDIO_COPY as C} from '@/constants/cms-studio-copy';
import type {CmsPageDto,CmsSectionDto} from '@/types/dto.types';
import type {CmsSectionInput} from '@/hooks/useAdminMutations';
export interface StorefrontEditorProps {
 page?:CmsPageDto;pages:CmsPageDto[];sections:CmsSectionDto[];selected?:CmsSectionDto;draft:CmsSectionInput;
 reordering?:boolean;
 dragging:boolean;suggestions:SectionSuggestion[];onRefreshSuggestions:()=>void;onAddSuggestion:(suggestion:SectionSuggestion)=>void;
 saveState:'idle'|'dirty'|'saving'|'saved'|'error';
 onPage:(slug:string)=>void;onSelect:(id:string)=>void;onAdd:()=>void;onSave:()=>void;onPublish:()=>void;onToggle:(section:CmsSectionDto)=>void;onDuplicate:(section:CmsSectionDto)=>void;onArchive:(section:CmsSectionDto)=>void;onHistory:()=>void;onDiscard:()=>void;onMove:(from:number,to:number)=>void;inspector:ReactNode;
}
const livePath=(slug:string):string=>slug==='home'?'/':['men','women','shop','sale','new-featured','collections'].includes(slug)?'/'+slug:'/pages/'+encodeURIComponent(slug);
const idOf=(section:CmsSectionDto):string=>section._id??section.id??section.title;
export function StorefrontEditor(props:StorefrontEditorProps):ReactNode{
 const {page,pages,sections,selected,draft,saveState}=props;
 const [tab,setTab]=useState<'content'|'layout'|'visibility'>('content');const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');const [zoom,setZoom]=useState('fit');const [previewOnly,setPreviewOnly]=useState(false);const [mobilePane,setMobilePane]=useState<'sections'|'preview'|'inspector'>('preview');
 const canvasDrop=useDroppable({id:'canvas-dropzone',disabled:!page||previewOnly});
 const changesPending=saveState==='dirty'||saveState==='saving'||saveState==='error'||Boolean(props.reordering);
 const status=saveState==='dirty'?C.unsaved:saveState==='saving'?C.saving:saveState==='saved'?C.saved:saveState==='error'?C.error:C.ready;
 return <div className={`cms-studio ${previewOnly?'cms-studio-preview-only':''}`} data-mobile-pane={mobilePane} data-dragging={props.dragging}>
  <header className="cms-studio-header"><div><p className="cms-studio-breadcrumb">CMS / Pages / {page?.title??'Home'}</p><h1>{C.title}</h1></div><div className="cms-studio-actions"><details className="cms-studio-settings">
    <summary><Settings2 size={16} />{C.settings}<ChevronDown size={14} /></summary>
    <nav aria-label={C.settings}>
      {([['/cms/experience', X.link], ['/cms/navigation', C.navigationSettings], ['/cms/quick-menu', C.quickMenu], ['/cms/footer', C.footer]] as const).map(([href,label]) =>
        <a key={href} href={href} aria-disabled={changesPending} onClick={event => { if (changesPending) event.preventDefault(); }}>{label}</a>)}
    </nav>
  </details><span className="cms-studio-status" data-state={saveState} role="status">{status}</span><button type="button" onClick={props.onSave} disabled={!selected||saveState==='saving'||props.reordering}>{C.save}</button><button type="button" aria-pressed={previewOnly} onClick={()=>setPreviewOnly(!previewOnly)}>{previewOnly?C.edit:C.preview}</button><button type="button" className="cms-studio-primary" onClick={props.onPublish} disabled={!page||saveState==='dirty'||saveState==='saving'||saveState==='error'||props.reordering}>{C.publish}</button></div></header>
  <div className="cms-studio-mobile-tabs">{(['sections','preview','inspector'] as const).map(pane=><button type="button" key={pane} aria-pressed={mobilePane===pane} onClick={()=>setMobilePane(pane)}>{pane==='sections'?C.sections:pane==='preview'?C.preview:C.inspector}</button>)}</div>
  <div className="cms-studio-grid"><aside className="cms-studio-sections"><div className="cms-studio-pane-heading"><h2>{C.sections}</h2><button type="button" className="cms-studio-primary" disabled={!page||changesPending} onClick={props.onAdd}><Plus size={14}/>{C.add}</button></div><label className="mb-4 grid gap-1 text-xs text-text-secondary">Page
    <select aria-label="CMS page" value={page?.slug??''} disabled={!page||changesPending} className="min-h-10 w-full border border-border bg-background-primary px-2 text-sm text-text-primary" onChange={e=>props.onPage(e.target.value)}>
      {!page&&<option value="">Loading pages…</option>}
      {pages.map(p=><option key={p.slug} value={p.slug}>{p.title}</option>)}
    </select>
  </label>
  {page?.status==='published'&&<a className="mb-4 text-xs text-accent-gold underline underline-offset-4" href={new URL(livePath(page.slug),process.env.NEXT_PUBLIC_STOREFRONT_URL??'http://localhost:3000').href} target="_blank" rel="noreferrer">{C.openLive}</a>}
  <p className="cms-studio-drag-hint" role={props.reordering?'status':undefined}>{props.reordering?X.ordering:X.drag}</p><nav aria-label={C.leftPane} className="cms-studio-section-rows">{sections.map((section,index)=><StudioSectionRow key={idOf(section)} section={section} busy={props.reordering} active={selected? idOf(section)===idOf(selected):false} index={index} count={sections.length} onSelect={()=>{props.onSelect(idOf(section));setMobilePane('inspector');}} onToggle={()=>props.onToggle(section)} onMove={to=>props.onMove(index,to)}/>)}{!sections.length&&<p>{C.noSections}</p>}</nav>
  {props.suggestions.length > 0 && <details className="cms-studio-suggestions">
    <summary>{C.suggestions}<ChevronDown size={14} /></summary>
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="text-xs text-text-secondary">{C.suggestionHelp}</p>
      <button type="button" title="Refresh suggestions" aria-label="Refresh suggestions" disabled={props.dragging || props.reordering} onClick={props.onRefreshSuggestions} className="grid h-9 w-9 shrink-0 place-items-center border border-border hover:border-accent-gold"><RefreshCw size={14} /></button>
    </div>
    <ul className="grid gap-2" aria-live="polite">{props.suggestions.map(item => <SuggestedSection key={item.type} suggestion={item} disabled={changesPending} onAdd={() => props.onAddSuggestion(item)} />)}</ul>
  </details>}
  <button type="button" className="cms-studio-history" onClick={props.onHistory}><History size={16}/>{C.history}</button></aside>
  <section ref={canvasDrop.setNodeRef} className="cms-studio-canvas" data-drag-over={canvasDrop.isOver}><div className="cms-studio-canvas-toolbar"><div><button type="button" aria-pressed={device==='desktop'} onClick={()=>setDevice('desktop')}><Monitor size={16}/>{C.desktop}</button><button type="button" aria-pressed={device==='mobile'} onClick={()=>setDevice('mobile')}><Smartphone size={16}/>{C.mobile}</button></div><select aria-label={C.zoom} value={zoom} onChange={e=>setZoom(e.target.value)}><option value="fit">Fit</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select></div><StorefrontPreview page={page} selected={selected} draft={draft} device={device} zoom={zoom} onSelect={id=>{props.onSelect(id);setMobilePane('inspector');}} revision={JSON.stringify(sections.map(s=>[s._id,s.sortOrder,s.type,s.active,s.products,s.categories,s.content?.productIds,s.content?.collectionIds]))}/></section>
  <aside inert={props.reordering??false} aria-busy={props.reordering??false} className="cms-studio-inspector" aria-label={C.inspector}><h2>{selected?.title??C.select}</h2><div role="tablist" aria-label={C.inspector} className="cms-studio-inspector-tabs">{(['content','layout','visibility'] as const).map(item=><button id={`cms-tab-${item}`} role="tab" type="button" aria-selected={tab===item} aria-controls="cms-studio-inspector-panel" key={item} onClick={()=>setTab(item)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const tabs=['content','layout','visibility'] as const;const next=tabs[(tabs.indexOf(tab)+(event.key==='ArrowRight'?1:2))%3];setTab(next);document.getElementById(`cms-tab-${next}`)?.focus();}}>{C[item]}</button>)}</div><div id="cms-studio-inspector-panel" role="tabpanel" aria-labelledby={`cms-tab-${tab}`} className="cms-inspector-body" data-tab={tab}>{props.inspector}</div>{selected&&<div className="cms-studio-visible-control"><span>{C.show}</span><button type="button" role="switch" aria-label={C.show} aria-checked={draft.active} onClick={()=>props.onToggle(selected)}><span/></button></div>}{selected&&<details className="cms-studio-inspector-options"><summary>{C.inspectorOptions}<ChevronDown size={14} /></summary>{page&&selected&&<label className="mx-3 my-2 grid gap-1 text-xs text-text-secondary">Section link<input readOnly className="min-w-0 border border-border bg-background-primary px-2 py-1 text-text-primary" onFocus={event=>event.currentTarget.select()} value={livePath(page.slug)+'#section-'+(selected.id??selected._id??selected.title)} /></label>}<div className="cms-studio-inspector-actions"><button type="button" onClick={()=>props.onDuplicate(selected)}><Copy size={15}/>{C.duplicate}</button><button type="button" onClick={()=>props.onArchive(selected)}><Trash2 size={15}/>{C.remove}</button>{(saveState==='dirty'||saveState==='error')&&<button type="button" onClick={props.onDiscard}>{C.discard}</button>}</div></details>}</aside></div>
  <footer className="cms-studio-footer"><span>{C.private}</span></footer>
 </div>;
}
export interface StudioSectionRowProps {section:CmsSectionDto;busy?:boolean;active:boolean;index:number;count:number;onSelect:()=>void;onToggle:()=>void;onMove:(index:number)=>void;}
function StudioSectionRow({section,busy=false,active,index,count,onSelect,onToggle,onMove}:StudioSectionRowProps):ReactNode{
 const id=idOf(section);const draggable=useDraggable({id,disabled:busy});const drop=useDroppable({id});
 return <div ref={node=>{draggable.setNodeRef(node);drop.setNodeRef(node);}} className="cms-studio-section-row" data-selected={active} data-dragging={draggable.isDragging} data-drag-over={drop.isOver}>
  <button type="button" className="cms-studio-grip" disabled={busy} {...draggable.attributes} {...draggable.listeners} aria-label={`Drag ${section.title}`}><GripVertical size={16}/></button><button type="button" className="cms-studio-section-name" aria-pressed={active} aria-label={`${C.selectSection}: ${section.title}`} onClick={onSelect}>{section.type==='hero_campaign'?'Campaign hero':section.title}</button><button type="button" className="cms-studio-eye" disabled={busy} aria-label={`${C.show}: ${section.title}`} aria-pressed={section.active??false} onClick={onToggle}>{section.active?<Eye size={16}/>:<EyeOff size={16}/>}</button><div className="cms-studio-row-order"><button type="button" aria-label={`${C.moveUp}: ${section.title}`} disabled={busy||index===0} onClick={()=>onMove(index-1)}><ArrowUp size={12}/></button><button type="button" aria-label={`${C.moveDown}: ${section.title}`} disabled={busy||index===count-1} onClick={()=>onMove(index+1)}><ArrowDown size={12}/></button></div>
 </div>;
}


function SuggestedSection({suggestion,disabled,onAdd}:{suggestion:SectionSuggestion;disabled:boolean;onAdd:()=>void}):ReactNode {
 const drag=useDraggable({id:'suggestion:'+suggestion.type,disabled});
 return <li ref={drag.setNodeRef} className="flex items-stretch gap-1 border border-border bg-background-primary" data-dragging={drag.isDragging}>
   <button type="button" className="cms-studio-grip shrink-0" disabled={disabled} {...drag.attributes} {...drag.listeners} aria-label={`Drag suggestion ${suggestion.title}`}><GripVertical size={14}/></button>
   <button type="button" className="min-h-11 min-w-0 flex-1 py-2 pr-2 text-left text-xs hover:text-accent-gold" disabled={disabled} aria-label={`Add suggestion ${suggestion.title}`} onClick={onAdd}><strong className="block">{suggestion.title}</strong><span className="block text-text-secondary">{suggestion.reason}</span></button>
 </li>;
}
