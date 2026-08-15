/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Einsatzaushang: Betongrau als Grund, harte Signalfarben darauf.
        beton: 'var(--beton)',
        tinte: 'var(--tinte)',
        signal: 'var(--signal)',
        marine: 'var(--marine)',
        warn: 'var(--warn)',
        blatt: 'var(--blatt)',
      },
      fontFamily: {
        mono: ['PlexMono', 'Consolas', 'DejaVu Sans Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
