import {describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const settings=vi.hoisted(()=>({pageLoader:'brand',motionPace:'calm'}));
vi.mock('@/hooks/useStorefrontExperience',()=>({useStorefrontExperience:()=>settings}));
import {BrandLoader} from './brand-loader';
describe('CMS-controlled brand loader',()=>{
 it('announces pending content and uses the original symbol without introducing a timer',()=>{settings.pageLoader='brand';settings.motionPace='calm';const html=renderToStaticMarkup(createElement(BrandLoader,{}));expect(html).toContain('role="status"');expect(html).toContain('brand-loading-symbol');expect(html).toContain('1800ms');});
 it('removes the decorative symbol when disabled while retaining the loading announcement',()=>{settings.pageLoader='none';const html=renderToStaticMarkup(createElement(BrandLoader,{}));expect(html).not.toContain('<svg');expect(html).toContain('Loading Cruisin');});
 it('uses the quicker motion preset from the CMS',()=>{settings.pageLoader='brand';settings.motionPace='quick';expect(renderToStaticMarkup(createElement(BrandLoader,{}))).toContain('1200ms');});
});
