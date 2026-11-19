import {describe,expect,it} from 'vitest';
import {storefrontNavigation} from './storefront-navigation';
import {storefrontExperienceSchema} from '@cruisin/contracts/storefront-experience';
import {storefrontLinksSchema} from '@cruisin/contracts/storefront-links';
import type {NavigationItemDto} from '@/types/dto.types';
const item=(label:string,sortOrder:number,isVisible=true):NavigationItemDto=>({id:label,label,slug:label,href:'/shop',type:'mega_menu',isMegaMenuEnabled:true,columns:[],isVisible,sortOrder});
describe('CMS navigation',()=>{
 it('preserves configured labels, extra groups and ordering without mutating the source',()=>{
  const items=[item('Kids',3),item('Featured',0),item('Members',1,false),item('Collections',2)];
  expect(storefrontNavigation(items).map(value=>value.label)).toEqual(['Featured','Collections','Kids']);
  expect(items[0].label).toBe('Kids');
 });
 it('respects an intentionally hidden menu',()=>{expect(storefrontNavigation([item('Hidden',0,false)])).toEqual([]);});
 it('supplies defaults for settings saved before mobile controls were introduced',()=>{
  expect(storefrontExperienceSchema.parse({}).mobilePurchaseDockEnabled).toBe(true);
  expect(storefrontLinksSchema.parse({}).headerDepartmentLinksVisibility).toBe('home');
  expect(storefrontLinksSchema.parse({headerDepartmentLinksVisibility:'hidden'}).headerDepartmentLinksVisibility).toBe('hidden');
  expect(storefrontLinksSchema.parse({}).menuUtilities.length).toBeGreaterThan(0);
  expect(storefrontLinksSchema.parse({menuUtilities:[]}).menuUtilities).toEqual([]);
 });
 it('rejects invalid dock values and external utility destinations',()=>{
  expect(storefrontExperienceSchema.safeParse({mobilePurchaseDockEnabled:'yes'}).success).toBe(false);
  expect(storefrontLinksSchema.safeParse({menuUtilities:[{label:'Account',href:'https://example.com'}]}).success).toBe(false);
 });
});
