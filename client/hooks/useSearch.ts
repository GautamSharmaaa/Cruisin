// Governed by .rules v1.0
import { useMemo, useState } from 'react';
import { PRODUCTS } from '@/constants/catalog';

export const useSearch = () => { const [query, setQuery] = useState(''); const results = useMemo(() => PRODUCTS.filter((product) => product.title.toLowerCase().includes(query.toLowerCase()) || product.tags.join(' ').toLowerCase().includes(query.toLowerCase())), [query]); return { query, setQuery, results }; };
