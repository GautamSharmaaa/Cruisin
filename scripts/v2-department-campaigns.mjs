// Local-only, repeatable CMS campaign setup. Existing version history remains available.
import axios from 'axios';
process.on('uncaughtException',error=>{console.error(error.response?.data??error.message);process.exitCode=1;});
import {writeFile} from 'node:fs/promises';
const base=process.env.V2_API_URL??'http://127.0.0.1:8192/api/v1';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local CMS setup only');
const api=axios.create({baseURL:base,headers:{Origin:'http://127.0.0.1:3193'}});
const auth=await api.post('/auth/login',{email:process.env.V2_ADMIN_EMAIL??'admin@cruisin.local',password:process.env.V2_ADMIN_PASSWORD??'CruisinAdmin123'});api.defaults.headers.common.Authorization='Bearer '+auth.data.data.accessToken;
const backup={};
const catalog=(await api.get('/products?limit=100')).data.data.items;
for(const slug of ['home','men','women']){const page=(await api.get('/cms/pages/'+slug)).data.data;const sections=(await api.get(`/cms/pages/${page._id}/sections`)).data.data;backup[slug]={page,sections};}
await writeFile('/tmp/cruisin-department-cms-before.json',JSON.stringify(backup,null,2));
for(const slug of ['home','men','women']){
 const {page,sections}=backup[slug];
 const key=slug==='home'?'home-street':slug==='men'?'men-studio':'women-city';
 const hero=sections.find(section=>section.type==='hero_campaign');
 const content={...(hero?.content??{}),desktopMedia:`/images/department/${key}.jpg`,mobileMedia:`/images/department/${key}.jpg`,posterImage:`/images/department/${key}.jpg`,videoUrl:`/videos/department/${key}.mp4`,altText:slug==='men'?'Menswear studio editorial':slug==='women'?'Womenswear city editorial':'Cruisin streetwear editorial',campaignLabel:slug==='home'?'':slug==='men'?'MEN / STUDIO EDIT':'WOMEN / CITY EDIT',ctaText:'Discover the edit',ctaLink:`/${slug==='home'?'shop':slug}#collection`};
 const draft={pageTarget:slug,type:'hero_campaign',title:slug==='home'?'Choose your edit':slug==='men'?'Built for your own rhythm.':'A different kind of everyday.',subtitle:slug==='home'?'':slug==='men'?'Layered silhouettes. Quiet confidence.':'Expressive layers, wherever the day goes.',content,styles:{editorial:{schemaVersion:1,captionAlign:slug==='women'?'center':'left',heroHeight:'screen',overlayStrength:30,mediaFit:'cover',shortcuts:[]}},sortOrder:0,active:true,status:'draft'};
 if(hero)await api.patch('/cms/sections/'+hero._id,draft);else await api.post(`/cms/pages/${page._id}/sections`,draft);
 if(slug!=='home'){
  const additions=[{type:'brand_story',title:slug==='men'?'The art of keeping it simple.':'Style is a point of view.',subtitle:slug==='men'?'Considered layers for days in motion.':'Make room for your own expression.',content:{founderNote:slug==='men'?'Explore relaxed tops, everyday trousers and outer layers. Build a wardrobe that moves with you.':'Discover easy tops, fluid layers and everyday essentials. Find the pieces that feel like you.',imageOne:`/images/department/${key}.jpg`,imageTwo:`/images/department/${key}-detail.jpg`,ctaText:'Shop '+slug,ctaLink:`/${slug}#collection`},sortOrder:slug==='men'?1:2},{type:'featured_collection',title:slug==='men'?'The everyday rotation':'In the women’s edit',subtitle:'Selected for your wardrobe',content:{limit:4,ctaText:'Explore all',ctaLink:`/${slug}#collection`},sortOrder:slug==='men'?2:1}];
  for(const addition of additions){const prior=sections.find(s=>s.type===addition.type&&s.title===addition.title);const selected=addition.type==='featured_collection'?(slug==='men'?['void-drape-hoodie','monolith-overshirt','cyber-cargo-pants','cyber-punk-parka']:['oversized-knit-cardigan','grid-linen-shirt','aero-graphic-tee','transit-tech-shorts']).map(name=>catalog.find(product=>product.slug===name)).filter(Boolean).map(product=>product._id??product.id):[];const body={...addition,products:selected,pageTarget:slug,active:true,status:'draft',styles:{editorial:{desktopColumns:slug==='men'?4:2,gap:slug==='men'?'tight':'standard'}}};if(prior)await api.patch('/cms/sections/'+prior._id,body);else await api.post(`/cms/pages/${page._id}/sections`,body);}
 }
}
for(const slug of ['home','men','women']){const page=backup[slug].page;await api.post(`/cms/pages/${page._id}/publish`);console.log('Updated local campaign:',slug);}
