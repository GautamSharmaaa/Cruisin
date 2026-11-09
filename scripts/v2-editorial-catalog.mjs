// Repeatable local demo catalog and CMS merchandising. Never targets a hosted API.
import axios from 'axios';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=process.env.V2_API_URL??'http://127.0.0.1:8192/api/v1';
const storefront=process.env.V2_STOREFRONT_URL??'http://127.0.0.1:3192';
for(const url of [base,storefront])if(!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Local demo setup only');
process.on('uncaughtException',error=>{console.error(error.response?.data??error.message);process.exitCode=1;});
const api=axios.create({baseURL:base,headers:{Origin:'http://127.0.0.1:3193'}});
const auth=await api.post('/auth/login',{email:process.env.V2_ADMIN_EMAIL??'admin@cruisin.local',password:process.env.V2_ADMIN_PASSWORD??'CruisinAdmin123'});api.defaults.headers.common.Authorization='Bearer '+auth.data.data.accessToken;
const categories=(await api.get('/categories')).data.data;
const prior=(await api.get('/products?limit=100')).data.data.items;
const pages={};
for(const slug of ['home','men','women']){const page=(await api.get('/cms/pages/'+slug)).data.data;pages[slug]={page,sections:(await api.get(`/cms/pages/${page._id}/sections`)).data.data};}
await writeFile('/tmp/cruisin-editorial-catalog-before-'+Date.now()+'.json',JSON.stringify({products:prior,pages},null,2));
const directory=resolve('client/public/images/catalog-demo');await mkdir(directory,{recursive:true});
const selections=[['mens-shirts',[83,85,86,87],'men','men/shirts'],['womens-dresses',[177,178,179,180],'women','women/dresses']];
const created=[];
for(const [category,ids,gender,target] of selections){
 const source=(await axios.get('https://dummyjson.com/products/category/'+category)).data;
 for(const item of source.products.filter(product=>ids.includes(product.id))){
  const images=[];
  for(const [index,url] of item.images.entries()){const media=await axios.get(url,{responseType:'arraybuffer'});const filename=`${item.id}-${index+1}.webp`;await writeFile(resolve(directory,filename),Buffer.from(media.data));images.push({url:storefront+'/images/catalog-demo/'+filename,alt:item.title+' — view '+(index+1),width:1500,height:1500});}
  const slug='studio-demo-'+item.id;const price=gender==='men'?2490:3990;
  const color= item.id===83?['Blue','#243b55']:item.id===85?['Red','#712c35']:item.id===86?['Grey','#8c9094']:item.id===87?['Blue','#364b6b']:item.id===177?['Black','#191919']:item.id===180?['Green','#566b4d']:['Black','#222222'];
  const description='Local demonstration item using sample product photography from DummyJSON. Prices, sizes and stock are synthetic and must be replaced before selling.';
  const payload={title:item.title,slug,description,richDescription:description,shortDescription:'Studio catalog preview',brand:'Studio Demo',category:categories.find(row=>row.path===target||row.slug===target)._id,categoryIds:[categories.find(row=>row.slug===gender)._id],gender,images,basePrice:price,variants:['S','M','L','XL'].map(size=>({size,color:color[0],colorHex:color[1],sku:`DEMO-${item.id}-${size}`,price,stock:0,enabled:true,images})),tags:['local-demo','studio-edit'],isFeatured:true,isNewArrival:true,sortOrder:-100+created.length,status:'published',visibility:'visible',isActive:true};
  const old=prior.find(product=>product.slug===slug);const saved=(old?await api.put('/products/'+(old._id??old.id),payload):await api.post('/products',payload)).data.data;created.push(saved);console.log('Prepared local demo:',slug,images.length,'photos');
 }
}
async function upsert(slug,body){const {page,sections}=pages[slug];const old=sections.find(section=>section.title===body.title&&section.type===body.type);const payload={...body,pageTarget:slug,active:true,status:'draft'};if(old)await api.patch('/cms/sections/'+old._id,payload);else await api.post(`/cms/pages/${page._id}/sections`,payload);}
for(const slug of ['home','men','women']){
 const products=created.filter(product=>slug==='home'||product.gender===slug).map(product=>product._id??product.id);
 await upsert(slug,{type:'featured_collection',title:slug==='home'?'The studio catalog':slug==='men'?'Shirts, reconsidered':'The evening edit',subtitle:'Discover the new rotation',products,content:{limit:8,ctaText:'Explore the catalog',ctaLink:slug==='home'?'/shop':`/${slug}#collection`},styles:{editorial:{desktopColumns:4,gap:'tight'}},sortOrder:1});
 for(const section of pages[slug].sections.filter(section=>section.type==='best_sellers'||['The everyday rotation','In the women’s edit'].includes(section.title)))await api.patch('/cms/sections/'+section._id,{active:false,status:'draft'});
 if(slug==='home'){
  const entry=pages.home.sections.find(section=>section.type==='hero_campaign'&&section.sortOrder===0);if(entry)await api.patch('/cms/sections/'+entry._id,{content:{...entry.content,desktopMedia:'/images/department/home-studio.jpg',mobileMedia:'/images/department/home-studio.jpg',posterImage:'/images/department/home-studio.jpg',videoUrl:'/videos/department/home-studio.mp4',altText:'Men and women studio editorial'},status:'draft'});
  await upsert(slug,{type:'category_editorial_grid',title:'Find your next chapter',content:{tiles:'Men / Studio|/images/department/men-studio.jpg|/men\nWomen / City|/images/department/women-city.jpg|/women\nThe shirt edit|/images/catalog-demo/83-1.webp|/category/men/shirts\nAfter hours|/images/catalog-demo/177-1.webp|/women#collection'},sortOrder:2});
  await upsert(slug,{type:'hero_campaign',title:'Quiet confidence. Everyday movement.',subtitle:'A study in light, texture and silhouette.',content:{desktopMedia:'/images/department/men-studio-detail.jpg',mobileMedia:'/images/department/men-studio.jpg',videoUrl:'/videos/department/men-studio.mp4',posterImage:'/images/department/men-studio.jpg',campaignLabel:'THE STUDIO FILM',ctaText:'Explore men',ctaLink:'/men'},styles:{editorial:{heroHeight:'screen',captionAlign:'left',overlayStrength:30}},sortOrder:3});
  await upsert(slug,{type:'brand_story',title:'A point of view, worn your way.',content:{founderNote:'From studio mornings to city evenings. Explore two distinct edits, built around the way you move.',imageOne:'/images/department/women-city.jpg',imageTwo:'/images/department/women-city-detail.jpg',ctaText:'Explore women',ctaLink:'/women'},sortOrder:4});
 }
 await api.post(`/cms/pages/${pages[slug].page._id}/publish`);console.log('Published local editorial page:',slug);
}
