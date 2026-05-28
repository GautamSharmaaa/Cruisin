// Governed by .rules v1.0
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: { primary: 'var(--bg-primary)', elevated: 'var(--bg-elevated)', overlay: 'var(--bg-overlay)', input: 'var(--bg-input)' },
        border: { subtle: 'var(--border-subtle)', DEFAULT: 'var(--border-default)', strong: 'var(--border-strong)' },
        text: { primary: 'var(--text-primary)', secondary: 'var(--text-secondary)', muted: 'var(--text-muted)', inverse: 'var(--text-inverse)' },
        accent: { gold: 'var(--accent-gold)', 'gold-dim': 'var(--accent-gold-dim)', white: 'var(--accent-white)' },
        success: 'var(--color-success)', warning: 'var(--color-warning)', danger: 'var(--color-danger)', info: 'var(--color-info)'
      },
      fontFamily: { display: ['var(--font-display)', 'Helvetica Neue', 'sans-serif'], body: ['var(--font-body)', 'Inter', 'sans-serif'], accent: ['var(--font-accent)', 'sans-serif'], mono: ['var(--font-mono)', 'Courier New', 'monospace'] },
      fontSize: { xs: ['11px', { lineHeight: '1.5', letterSpacing: '0.04em' }], sm: ['13px', { lineHeight: '1.6', letterSpacing: '0.02em' }], base: ['15px', { lineHeight: '1.7', letterSpacing: '0.01em' }], md: ['17px', { lineHeight: '1.6' }], lg: ['20px', { lineHeight: '1.5' }], xl: ['24px', { lineHeight: '1.4' }], '2xl': ['32px', { lineHeight: '1.3' }], '3xl': ['40px', { lineHeight: '1.2' }], '4xl': ['56px', { lineHeight: '1.1' }], '5xl': ['72px', { lineHeight: '1' }], hero: ['clamp(72px,12vw,140px)', { lineHeight: '0.95', letterSpacing: '-0.03em' }] },
      boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)', gold: 'var(--shadow-gold)' },
      backgroundImage: { hero: 'var(--gradient-hero)', card: 'var(--gradient-card)', gold: 'var(--gradient-gold)' },
      animation: { shimmer: 'shimmer 1.5s infinite linear', 'pulse-line': 'pulse-line 1.8s infinite ease-in-out' },
      keyframes: { shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } }, 'pulse-line': { '0%, 100%': { transform: 'scaleY(0.4)', opacity: '0.5' }, '50%': { transform: 'scaleY(1)', opacity: '1' } } }
    }
  },
  plugins: []
};

export default config;
