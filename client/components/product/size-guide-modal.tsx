// Governed by .rules v1.0
'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/shared/modal';
import { COPY } from '@/constants/copy';

export interface SizeGuideModalProps { }
export function SizeGuideModal(_props: SizeGuideModalProps): ReactNode { const [open, setOpen] = useState(false); return <><Button variant="ghost" onClick={() => setOpen(true)}>{COPY.product.sizeGuide}</Button><Modal open={open} onOpenChange={setOpen} title={COPY.product.sizeGuide}><div className="grid grid-cols-4 gap-px text-sm text-text-secondary"><span>Size</span><span>Chest</span><span>Waist</span><span>Length</span><span>S</span><span>38</span><span>30</span><span>27</span><span>M</span><span>40</span><span>32</span><span>28</span><span>L</span><span>42</span><span>34</span><span>29</span></div></Modal></>; }
