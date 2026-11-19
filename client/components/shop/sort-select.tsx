'use client';
import {useRef,useState,type ReactNode} from 'react';
import * as Popover from '@radix-ui/react-popover';
import {ChevronDown,Check} from 'lucide-react';
import {STOREFRONT_COPY as C} from '@/constants/storefront-copy';
export interface SortSelectProps {value:string;onChange:(value:string)=>void;}
export function SortSelect({value,onChange}:SortSelectProps):ReactNode{
 const [open,setOpen]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 const interactedOutside=useRef(false);
 return <Popover.Root open={open} onOpenChange={setOpen}>
  <Popover.Trigger ref={trigger} className="collection-sort-trigger">{C.sort}<ChevronDown size={16} aria-hidden="true"/></Popover.Trigger>
  <Popover.Portal>
   <Popover.Content align="end" sideOffset={16} className="collection-sort-menu" aria-label={C.sort}
    onInteractOutside={()=>{interactedOutside.current=true;}}
    onCloseAutoFocus={event=>{
     event.preventDefault();
     if(!interactedOutside.current)trigger.current?.focus({preventScroll:true});
     interactedOutside.current=false;
    }}>
    {C.sortOptions.map(([key,label])=><button type="button" key={key} aria-pressed={value===key} onClick={()=>{onChange(key);setOpen(false);}}>{label}{key===value&&<Check size={14}/>}</button>)}
   </Popover.Content>
  </Popover.Portal>
 </Popover.Root>;
}
