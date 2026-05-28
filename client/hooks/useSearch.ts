// Governed by .rules v1.0
import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';

export const useSearch = () => { const [query, setQuery] = useState(''); const { data } = useProducts({ q: query, limit: 8 }); return { query, setQuery, results: data?.items ?? [] }; };
