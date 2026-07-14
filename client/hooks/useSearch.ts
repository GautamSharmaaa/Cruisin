// Governed by .rules v1.0
import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';

export const useSearch = () => { const [query, setQuery] = useState(''); const normalizedQuery = query.trim(); const { data } = useProducts({ q: normalizedQuery || undefined, limit: 8, enabled: normalizedQuery.length > 0 }); return { query, setQuery, results: data?.items ?? [] }; };
