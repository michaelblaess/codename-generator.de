import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';

const CACHE = `${process.env.LOCALAPPDATA}/ms-playwright`;
const shell = readdirSync(CACHE)
  .filter((n) => n.startsWith('chromium_headless_shell-'))
  .sort()
  .at(-1);
const EXE = `${CACHE}/${shell}/chrome-headless-shell-win64/chrome-headless-shell.exe`.replaceAll(
  '\\',
  '/',
);

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({
  viewport: {
    width: Number(process.env.SHOT_W ?? 1280),
    height: Number(process.env.SHOT_H ?? 1000),
  },
});
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200));
});
await page.goto(process.env.SHOT_URL, { waitUntil: 'networkidle' });

// Die Astro-Dev-Toolbar gehoert nicht ins Bild.
await page.addStyleTag({ content: 'astro-dev-toolbar { display: none !important; }' });

// Optional den Druckkopf ausloesen und mitten im Lauf abdruecken.
if (process.env.SHOT_PRINT === '1') {
  await page.getByRole('button', { name: 'NEUER STAPEL' }).click();
  await page.waitForTimeout(Number(process.env.SHOT_DELAY ?? 260));
} else {
  await page.waitForTimeout(2500);
}

await page.screenshot({
  path: process.env.SHOT_OUT ?? 'entwurf.png',
  fullPage: process.env.SHOT_FULL === '1',
});
await browser.close();
console.log('ok');
