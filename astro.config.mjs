import { execFileSync } from 'node:child_process';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/*
 * Solange die Seite unter michaelblaess.github.io/codename-generator.de/ liegt,
 * braucht sie den Unterpfad als `base` - sonst zeigen alle Asset-URLs auf die
 * Wurzel der Domain und laufen ins Leere.
 *
 * Umstellung auf die eigene Domain, wenn sie bei netcup registriert ist:
 *   1. DNS: A-Records auf die vier GitHub-Pages-IPs (185.199.108-111.153),
 *      www als CNAME auf michaelblaess.github.io.
 *   2. public/CNAME anlegen mit der Zeile "codename-generator.de".
 *   3. Hier SITE auf 'https://codename-generator.de' und BASE auf '/' setzen.
 */
const SITE = 'https://michaelblaess.github.io';
const BASE = '/codename-generator.de';

// lastmod je Seite aus dem letzten Commit, der sie oder etwas Gemeinsames
// (Layout, Bauteile, Texte, Daten) beruehrt hat. Die Pipeline braucht dafuer
// die volle Historie (fetch-depth: 0), sonst stuende ueberall derselbe Tag.
const GEMEINSAM = ['src/layouts', 'src/components', 'src/i18n', 'src/lib', 'src/data', 'src/styles'];
function letzteAenderung(url) {
  const rest = new URL(url).pathname.slice(BASE.length).replace(/^\/|\/$/g, '');
  const seite = `src/pages/${rest === '' ? 'index' : rest === 'en' ? 'en/index' : rest}.astro`;
  const datum = execFileSync('git', ['log', '-1', '--format=%cI', '--', seite, ...GEMEINSAM], { encoding: 'utf8' }).trim();
  return datum || new Date().toISOString();
}

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [react(), sitemap({ serialize: (item) => ({ ...item, lastmod: letzteAenderung(item.url) }) })],
  // Tailwind kommt seit Fassung 4 als Vite-Plugin. Die frueheren
  // Basis-Stile (applyBaseStyles) stecken jetzt in @import "tailwindcss"
  // in src/styles/global.css.
  vite: { plugins: [tailwindcss()] },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { format: 'directory' },
});
