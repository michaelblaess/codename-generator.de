/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Endlospapier fuer Nadeldrucker: warmes Weiss mit blassgruenen Bahnen
        // (Greenbar), Trommeldruck in warmem Schwarz, ein einziger Akzent aus
        // dem Farbband.
        papier: 'var(--papier)',
        greenbar: 'var(--greenbar)',
        druck: 'var(--druck)',
        durchschlag: 'var(--durchschlag)',
        farbband: 'var(--farbband)',
        gehaeuse: 'var(--gehaeuse)',
        lochung: 'var(--lochung)',
      },
      fontFamily: {
        mono: ['PlexMono', 'Consolas', 'DejaVu Sans Mono', 'monospace'],
      },
      letterSpacing: {
        telex: '0.32em',
      },
    },
  },
  plugins: [],
};
