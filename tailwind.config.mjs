/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Phosphor-Terminal: Hintergrund fast schwarz, Schrift Bernstein/Gruen.
        crt: 'var(--crt)',
        phosphor: 'var(--phosphor)',
        phosphorDim: 'var(--phosphor-dim)',
        amber: 'var(--amber)',
        scan: 'var(--scan)',
        panel: 'var(--panel)',
        rule: 'var(--rule)',
      },
      fontFamily: {
        // Consolas/DejaVu/Menlo zuerst: die Retro-Effekte brauchen die
        // Blockglyphen (Schattierungszeichen), sonst zerfaellt die Spaltenbreite.
        mono: ['Consolas', 'DejaVu Sans Mono', 'Menlo', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 12px var(--phosphor-dim)',
      },
    },
  },
  plugins: [],
};
