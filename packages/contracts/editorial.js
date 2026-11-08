import {z} from 'zod';
export const editorialLinkSchema=z.string().trim().min(1).max(400).refine(value=>{
 if(/[\\\x00-\x20]/.test(value)||value.startsWith('//')||value==='#')return false;
 if(value.startsWith('/'))return true;
 try{return new URL(value).protocol==='https:';}catch{return false;}
},'Use a valid internal route or HTTPS destination');
export const editorialPresentationSchema=z.object({
 schemaVersion:z.literal(1).default(1),
 captionAlign:z.enum(['center','left']).default('center'),
 heroHeight:z.enum(['screen','tall']).default('screen'),
 focalPoint:z.enum(['center','top','bottom','left','right']).default('center'),
 mobileFocalPoint:z.enum(['center','top','bottom','left','right']).default('center'),
 mediaFit:z.enum(['cover','contain']).default('cover'),
 overlay:z.enum(['none','soft','strong']).default('soft'),
 desktopColumns:z.union([z.literal(2),z.literal(4)]).default(4),
 gap:z.enum(['tight','standard']).default('tight'),
 quickAdd:z.boolean().default(true),
 shortcuts:z.array(z.object({label:z.string().trim().min(1).max(40),href:editorialLinkSchema}).strict()).max(8).default([]),
}).strict();
export const editorialPresentation=value=>{const result=editorialPresentationSchema.safeParse(value);return result.success?result.data:editorialPresentationSchema.parse({});};
export const cmsPreviewPatchSchema=z.object({type:z.literal('cruisin.cms.preview'),sectionId:z.string().min(1).max(100),draft:z.object({title:z.string().max(180),subtitle:z.string().max(240).optional(),description:z.string().max(1000).optional(),content:z.record(z.string(),z.unknown()),styles:z.object({editorial:editorialPresentationSchema.optional()}).catchall(z.unknown()),active:z.boolean(),hideOnDesktop:z.boolean(),hideOnMobile:z.boolean()}).strict()}).strict();
