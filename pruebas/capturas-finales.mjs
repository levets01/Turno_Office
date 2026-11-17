import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.STUDIO_URL ?? 'http://127.0.0.1:5175';
const capturePath = fileURLToPath(new URL('./capturas/', import.meta.url));
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
async function pageFor(viewport, mobile = false) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(1400);
  return page;
}
async function capture(page, name) {
  await page.screenshot({ path: `${capturePath}${name}.png`, fullPage: true });
  console.log('Captured', name);
}
try {
  if (process.argv.includes('--solo-movil')) {
    const mobile = await pageFor({ width: 390, height: 844 }, true);
    await capture(mobile, 'movil-final');
  } else {
  const justCard = process.argv.includes('--solo-tarjeta');
  if (!justCard) {
    const wide = await pageFor({ width: 1920, height: 900 });
    await capture(wide, 'escritorio-ancho-final');
    await wide.close();
  }
  const desktop = await pageFor({ width: 1440, height: 1000 });
  if (!justCard) {
    await capture(desktop, 'escritorio-final');
    const mobile = await pageFor({ width: 390, height: 844 }, true);
    await capture(mobile, 'movil-final');
    await mobile.getByRole('button', { name: 'Pruebas', exact: true }).click();
    await mobile.waitForTimeout(1700);
    await capture(mobile, 'movil-enfoque-final');
  }
  if (justCard) {
    await desktop.getByRole('button', { name: 'Acercar cámara', exact: true }).click();
    await desktop.getByRole('button', { name: 'Acercar cámara', exact: true }).click();
    await desktop.waitForTimeout(500);
  }
  await desktop.getByTestId('demo-start').click();
  if (!justCard) {
    await desktop.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.getAttribute('data-stage') === 'pickup');
    await desktop.waitForTimeout(900);
    await capture(desktop, 'tarjeta-recogida-final');
  }
  await desktop.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.getAttribute('data-stage') === 'testing');
  await desktop.waitForTimeout(justCard ? 250 : 900);
  await capture(desktop, justCard ? 'tarjeta-entrega-detalle' : 'tarjeta-entrega-final');
  }
  assert.deepEqual(errors, []);
  console.log('PASS: final desktop/mobile framing and messenger visuals; zero runtime errors.');
} finally {
  await browser.close();
}
