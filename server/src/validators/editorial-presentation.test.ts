import {describe,it,expect} from 'vitest';
import {editorialPresentationSchema} from '@cruisin/contracts/editorial';
import {cmsSectionBodySchema} from './cms.validator.js';
describe('shared editorial presentation controls',()=>{
 it('supplies constrained editorial defaults',()=>{expect(editorialPresentationSchema.parse({})).toMatchObject({captionAlign:'center',heroHeight:'screen',desktopColumns:4,quickAdd:true});});
 it('rejects unsafe and dead shortcut destinations',()=>{for(const href of ['#','javascript:alert(1)','//evil.test','/\\evil.test'])expect(editorialPresentationSchema.safeParse({shortcuts:[{label:'Shop',href}]}).success).toBe(false);});
 it('rejects unsupported presets at the CMS API boundary',()=>{expect(()=>cmsSectionBodySchema.parse({type:'hero_campaign',title:'Campaign',styles:{editorial:{focalPoint:'arbitrary-css'}}})).toThrow();});
 it('preserves independent mobile focal points and valid category destinations',()=>{expect(editorialPresentationSchema.parse({focalPoint:'top',mobileFocalPoint:'left',shortcuts:[{label:'Men',href:'/men'}]})).toMatchObject({focalPoint:'top',mobileFocalPoint:'left',shortcuts:[{label:'Men',href:'/men'}]});});
});
