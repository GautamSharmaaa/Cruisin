import {beforeAll,afterAll,it,expect} from 'vitest';
import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import {CmsService} from './cms.service.js';
import {CMSPageModel,CMSSectionModel,CMSVersionModel} from '../models/cms.model.js';
const ids:string[]=[];
beforeAll(async()=>{await mongoose.connect(process.env.MONGODB_URI!);});
afterAll(async()=>{await CMSSectionModel.deleteMany({pageId:{$in:ids}});await CMSVersionModel.deleteMany({pageId:{$in:ids}});await CMSPageModel.deleteMany({_id:{$in:ids}});await mongoose.disconnect();});
const fixture=async()=>{const p=await CMSPageModel.create({slug:`cms-${randomUUID()}`,title:'Synthetic campaign',previewToken:randomUUID()});ids.push(p.id);return p;};
it('never exposes draft-only pages, even if a section claims published',async()=>{const p=await fixture();await CmsService.createSection(p.id,{type:'brand_story',title:'Unreleased story',status:'published'});await expect(CmsService.publicPage(p.slug)).rejects.toMatchObject({statusCode:404});});
it('keeps an empty published revision authoritative after editing its draft',async()=>{const p=await fixture();await CmsService.publishPage(p.id);await CmsService.createSection(p.id,{type:'brand_story',title:'Unreleased story',status:'published'});expect(await CmsService.publicPage(p.slug)).toMatchObject({sections:[],preview:false});expect(await CmsService.publicPage(p.slug,{previewToken:p.previewToken})).toMatchObject({preview:true,sections:[{title:'Unreleased story'}]});});
it('rejects invalid preview credentials and public time-travel requests',async()=>{const p=await fixture();await expect(CmsService.publicPage(p.slug,{previewToken:'invalid'})).rejects.toMatchObject({statusCode:403});await expect(CmsService.publicPage(p.slug,{scheduledAt:new Date('2099-01-01')})).rejects.toMatchObject({statusCode:403});});
it('keeps shared products canonical while department pages exclude ineligible products',async()=>{
 const {ProductModel}=await import('../models/product.model.js');
 const {CategoryModel}=await import('../models/category.model.js');
 const key=randomUUID();const category=await CategoryModel.create({name:'Editorial fixture',image:'/cruisin-image-fallback.svg',slug:`editorial-${key}`});
 const products=await ProductModel.create(['unisex','men'].map((gender,index)=>({title:'Synthetic editorial garment',slug:`editorial-${key}-${index}`,description:'Synthetic fixture',richDescription:'Synthetic fixture',category:category._id,basePrice:1200,gender,status:'published',visibility:'visible',isActive:true,variants:[{sku:`EDITORIAL-${key}-${index}`,size:'M',color:'Black',colorHex:'#080808',price:1200,stock:3}]})));
 // Use temporary unique slugs, then switch only these synthetic fixtures to the recognized department context.
 const p=await fixture();const original=await CMSPageModel.findOne({slug:'women'});if(original)await CMSPageModel.updateOne({_id:original._id},{$set:{slug:`saved-women-${key}`}});
 try{await CMSPageModel.updateOne({_id:p._id},{$set:{slug:'women'}});await CmsService.createSection(p.id,{type:'product_carousel',title:'Department edit',products:products.map(r=>r._id)});await CmsService.publishPage(p.id);const result=await CmsService.publicPage('women') as {sections:{products:{_id:unknown;variants:{_id:unknown;stock:number;price:number}[]}[]}[]};expect(result.sections[0].products).toHaveLength(1);expect(String(result.sections[0].products[0]._id)).toBe(products[0].id);expect(result.sections[0].products[0].variants[0]).toMatchObject({stock:3,price:1200});expect(String(result.sections[0].products[0].variants[0]._id)).toBe(String(products[0].variants[0]._id));}
 finally{await CMSPageModel.updateOne({_id:p._id},{$set:{slug:p.slug}});if(original)await CMSPageModel.updateOne({_id:original._id},{$set:{slug:'women'}});await ProductModel.deleteMany({_id:{$in:products.map(r=>r._id)}});await CategoryModel.deleteOne({_id:category._id});}
});
it('protects CMS media while referenced by a draft or retained published revision',async()=>{
 const {MediaService}=await import('./media/media.service.js');const {MediaAssetModel}=await import('../models/media-asset.model.js');
 const actor={actor:{id:new mongoose.Types.ObjectId().toString(),kind:'admin' as const,name:'Synthetic CMS media administrator',permissions:['media.manage' as const]},correlationId:randomUUID()};
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1UAAAAASUVORK5CYII=','base64');
 const asset=await MediaService.upload(actor,{name:'cms-reference.png',contentType:'image/png',visibility:'public',body:png}) as {id:string};const p=await fixture();
 try{const section=await CmsService.createSection(p.id,{type:'hero_campaign',title:'Media reference fixture',content:{desktopMedia:`http://127.0.0.1:8192/api/v1/media/${asset.id}/content`}}) as {_id:unknown};await expect(MediaService.remove(actor,asset.id)).rejects.toMatchObject({statusCode:409});await CmsService.publishPage(p.id);await CmsService.updateSection(String(section._id),{content:{desktopMedia:'/replacement.png'}});await expect(MediaService.remove(actor,asset.id)).rejects.toMatchObject({statusCode:409});expect((await MediaAssetModel.findById(asset.id))?.deletedAt).toBeUndefined();}
 finally{await MediaAssetModel.deleteOne({_id:asset.id});}
});
it('restores a retained version into the draft without changing the published release',async()=>{
 const p=await fixture();const original=await CmsService.createSection(p.id,{type:'brand_story',title:'First release'}) as {_id:unknown};await CmsService.publishPage(p.id);
 const first=await CMSVersionModel.findOne({pageId:p.id,status:'published'}).lean();expect(first).not.toBeNull();
 await CmsService.updateSection(String(original._id),{title:'Second release'});await CmsService.publishPage(p.id);
 await CmsService.restoreVersion(p.id,String(first!._id));
 expect(await CmsService.publicPage(p.slug)).toMatchObject({preview:false,sections:[{title:'Second release'}]});
 expect(await CmsService.publicPage(p.slug,{previewToken:p.previewToken})).toMatchObject({preview:true,sections:[{title:'First release'}]});
 await CmsService.publishPage(p.id);expect(await CmsService.publicPage(p.slug)).toMatchObject({sections:[{title:'First release'}]});
});
