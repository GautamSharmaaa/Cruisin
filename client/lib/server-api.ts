// Governed by .rules v1.0
import axios from 'axios';
import { API_CONFIG } from '@/constants/config';

export const serverApi = axios.create({ baseURL: API_CONFIG.baseUrl, timeout: API_CONFIG.timeout });
