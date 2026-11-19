'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

const CrystalizedBall = dynamic(() => import('./crystalized-ball/crystalized-ball'), { ssr: false });

export function InsightOrb() {
  const { resolvedTheme } = useTheme();
  return <div className="workspace-insight-orb" aria-hidden="true">
    <span className="workspace-insight-halo" />
    <span className="workspace-insight-orb-fallback" />
    <CrystalizedBall
      preset="solar"
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      size={0.76}
      glow={1.1}
      speed={0.65}
      motion="orbit"
      particleShape="square"
      intro={false}
      hoverStrength={0.1}
    />
  </div>;
}
