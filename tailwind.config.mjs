/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // VIC-II-Palette des C64 (Pepto-Werte), siehe global.css.
        rand: 'var(--rand)',
        schirm: 'var(--schirm)',
        schirmTief: 'var(--schirm-tief)',
        hellblau: 'var(--hellblau)',
        gelb: 'var(--gelb)',
        cyan: 'var(--cyan)',
        gruen: 'var(--gruen)',
        rot: 'var(--rot)',
        grau: 'var(--grau)',
        schwarz: 'var(--schwarz)',
      },
      fontFamily: {
        mono: ['PlexMono', 'Consolas', 'DejaVu Sans Mono', 'monospace'],
        pixel: ['PressStart', 'PlexMono', 'monospace'],
      },
    },
  },
  plugins: [],
};
