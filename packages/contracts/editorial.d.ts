import type {z} from 'zod';
export interface EditorialPresentation {
 schemaVersion:1;captionAlign:'center'|'left';heroHeight:'screen'|'tall';
 focalPoint:'center'|'top'|'bottom'|'left'|'right';mobileFocalPoint:'center'|'top'|'bottom'|'left'|'right';mediaFit:'cover'|'contain';
 buttons?:{label:string;href:string}[];overlayStrength:number;
 overlay:'none'|'soft'|'strong';desktopColumns:2|4;gap:'tight'|'standard';quickAdd:boolean;shortcuts:{label:string;href:string}[];
}
export const editorialPresentationSchema:z.ZodType<EditorialPresentation>;
export const editorialLinkSchema:z.ZodType<string>;
export function editorialPresentation(value:unknown):EditorialPresentation;
export interface CmsPreviewPatch {type:'cruisin.cms.preview';sectionId:string;draft:{title:string;subtitle?:string;description?:string;content:Record<string,unknown>;styles:Record<string,unknown>;active:boolean;hideOnDesktop:boolean;hideOnMobile:boolean};}
export const cmsPreviewPatchSchema:z.ZodType<CmsPreviewPatch>;
