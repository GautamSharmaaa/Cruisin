// Governed by .rules v1.0
import { useEffect, useRef, useState } from 'react';

export const useIntersection = <TElement extends Element>() => { const ref = useRef<TElement | null>(null); const [visible, setVisible] = useState(false); useEffect(() => { const node = ref.current; if (!node) return undefined; const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { rootMargin: '200px' }); observer.observe(node); return () => observer.disconnect(); }, []); return { ref, visible }; };
