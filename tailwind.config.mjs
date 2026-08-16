/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette aus Goldrunner (Atari ST, 1987), siehe global.css.
        schwarz: 'var(--schwarz)',
        goldHell: 'var(--gold-hell)',
        gold: 'var(--gold)',
        goldTief: 'var(--gold-tief)',
        magenta: 'var(--magenta)',
        magentaTief: 'var(--magenta-tief)',
        lila: 'var(--lila)',
        gruen: 'var(--gruen)',
        creme: 'var(--creme)',
        dunst: 'var(--dunst)',
      },
      fontFamily: {
        mono: ['PlexMono', 'Consolas', 'DejaVu Sans Mono', 'monospace'],
        pixel: ['PressStart', 'PlexMono', 'monospace'],
      },
    },
  },
  plugins: [],
};
