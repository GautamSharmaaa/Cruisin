import {describe,it,expect} from 'vitest';
import {readOrbitContent,DEFAULT_ORBIT_CONTENT} from '@cruisin/contracts/orbit-cards';
import {cmsSectionBodySchema,cmsSectionUpdateSchema} from './cms.validator.js';
describe('orbit card configuration',()=>{
 it('preserves omitted CMS fields when updating order or visibility',()=>{expect(cmsSectionUpdateSchema.parse({sortOrder:4})).toEqual({sortOrder:4});expect(cmsSectionUpdateSchema.parse({active:false})).toEqual({active:false});});
 it('supports a real CMS section with editable default content',()=>{expect(cmsSectionBodySchema.parse({type:'orbit_cards',title:'Cruisin orbit',content:DEFAULT_ORBIT_CONTENT}).type).toBe('orbit_cards');expect(readOrbitContent(DEFAULT_ORBIT_CONTENT)?.cards).toHaveLength(8);});
 it('rejects unsafe destinations and malformed card data',()=>{const cards=JSON.parse(DEFAULT_ORBIT_CONTENT.cards) as Array<{href:string}>;cards[0].href='javascript:alert(1)';expect(readOrbitContent({...DEFAULT_ORBIT_CONTENT,cards:JSON.stringify(cards)})).toBeNull();expect(readOrbitContent({...DEFAULT_ORBIT_CONTENT,cards:'{broken'})).toBeNull();});
 it('bounds count and speed while supporting manual-only exploration',()=>{expect(readOrbitContent({...DEFAULT_ORBIT_CONTENT,cycleSeconds:0})).toBeNull();expect(readOrbitContent({...DEFAULT_ORBIT_CONTENT,cards:'[]'})).toBeNull();expect(readOrbitContent({...DEFAULT_ORBIT_CONTENT,autoplay:false,mouseControl:false,cycleSeconds:64})).toMatchObject({autoplay:false,mouseControl:false,cycleSeconds:64});});
});
