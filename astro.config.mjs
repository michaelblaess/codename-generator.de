import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// site steht auf der Wunschdomain. Solange nur GitHub Pages laeuft, zeigt der
// CNAME in public/ dorthin - beides bleibt konsistent, wenn die Domain kommt.
export default defineConfig({
  site: 'https://codename-generator.de',
  integrations: [react(), tailwind({ applyBaseStyles: false }), sitemap()],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { format: 'directory' },
});
