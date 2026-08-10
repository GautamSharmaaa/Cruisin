// Governed by .rules v1.0
import axios from 'axios';
import { API_CONFIG } from '@/constants/config';

const proxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, '');
const baseURL = proxyTarget ? `${proxyTarget}/api/v1` : API_CONFIG.baseUrl;

export const serverApi = axios.create({ baseURL, timeout: API_CONFIG.timeout });
