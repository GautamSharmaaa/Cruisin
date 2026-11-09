// Add the default orbit to the local Home page. Existing card edits are preserved.
import axios from 'axios';
import { writeFile } from 'node:fs/promises';
import { DEFAULT_ORBIT_CONTENT } from '../packages/contracts/orbit-cards.js';

const base = process.env.V2_API_URL ?? 'http://127.0.0.1:8192/api/v1';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local CMS only');
process.on('uncaughtException', error => {
  console.error(error.response?.data ?? error.message);
  process.exitCode = 1;
});
const api = axios.create({ baseURL: base, headers: { Origin: 'http://127.0.0.1:3193' } });
const auth = await api.post('/auth/login', {
  email: process.env.V2_ADMIN_EMAIL ?? 'admin@cruisin.local',
  password: process.env.V2_ADMIN_PASSWORD ?? 'CruisinAdmin123'
});
api.defaults.headers.common.Authorization = 'Bearer ' + auth.data.data.accessToken;
const page = (await api.get('/cms/pages/home')).data.data;
const pagePath = `/cms/pages/${page._id}`;
const sections = (await api.get(`${pagePath}/sections`)).data.data;
await writeFile(`/tmp/cruisin-orbit-before-${Date.now()}.json`, JSON.stringify({ pageId: page._id, sections }, null, 2), { mode: 0o600 });

const existing = sections.find(section => section.type === 'orbit_cards');
const orbit = existing ?? (await api.post(`${pagePath}/sections`, {
  pageTarget: 'home',
  type: 'orbit_cards',
  title: 'The Cruisin orbit',
  subtitle: 'Different edits. One point of view.',
  content: DEFAULT_ORBIT_CONTENT,
  sortOrder: 1,
  active: true,
  status: 'draft'
})).data.data;
const entry = sections.find(section => section.type === 'hero_campaign' && section.active);
const remaining = sections.filter(section => section._id !== entry?._id && section._id !== orbit._id);
const ids = [...(entry ? [entry] : []), orbit, ...remaining].map(section => section._id);
await api.post(`${pagePath}/reorder`, { ids });
await api.post(`${pagePath}/publish`);
console.log('Published the local Home orbit');
