import {describe,it,expect} from 'vitest';
import {storefrontMotion} from './storefront-motion';
describe('storefront motion preferences',()=>{
 it('uses restrained interpolation for full motion',()=>{expect(storefrontMotion(false)).toMatchObject({pageDuration:0.55,revealDistance:20,smoothWheel:true});});
 it('removes movement and interpolation for reduced motion',()=>{expect(storefrontMotion(true)).toMatchObject({pageDuration:0,revealDistance:0,smoothWheel:false});});
});
