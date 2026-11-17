import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Requires an existing local Vite server: npm run dev
const baseURL = process.env.STUDIO_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const captures = fileURLToPath(new URL('./capturas/', import.meta.url));
await mkdir(captures, { recursive: true });

async function capture(page, name) {
  await page.screenshot({ path: `${captures}${name}.png`, fullPage: true });
  console.log('Capture:', name);
}

async function verifyPage(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  console.log('Navigating', baseURL);
  const response = await page.goto(baseURL, { waitUntil: 'networkidle' });
  console.log('Loaded', response.status());
  assert.equal(response.status(), 200);
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('canvas').count(), 1, 'one 3D canvas');
  assert.ok(await page.getByTestId('demo-start').isVisible(), 'demo is accessible');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page overflow');
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await verifyPage(desktop);
  await capture(desktop, 'escritorio-inicial');
  await desktop.getByRole('button', { name: 'Acercar cámara', exact: true }).click();
  await desktop.waitForTimeout(700);
  await capture(desktop, 'escritorio-acercamiento');
  await desktop.getByRole('button', { name: 'Volver a la vista general', exact: true }).click();
  await desktop.waitForTimeout(700);
  await desktop.getByTestId('demo-start').click();
  await desktop.getByTestId('stage').waitFor({ state: 'attached' });
  await desktop.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.getAttribute('data-stage') === 'writing');
  // Extra clicks while running must not restart the same episode.
  await desktop.getByTestId('demo-start').evaluate(button => {
    for (let count = 0; count < 8; count++) button.click();
  });
  await desktop.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.getAttribute('data-stage') === 'walking', null, { timeout: 20000 });
  assert.equal(await desktop.getByTestId('courier').count(), 1, 'rapid repeat clicks create exactly one messenger');
  await capture(desktop, 'escritorio-mensajero');
  await desktop.getByRole('button', { name: /^(Abrir )?Pruebas$/ }).first().click();
  await desktop.getByRole('dialog').waitFor();
  await desktop.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.getAttribute('data-stage') === 'testing', null, { timeout: 20000 });
  assert.equal(await desktop.getByTestId('courier').count(), 1);
  await capture(desktop, 'escritorio-entrega');
  await desktop.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.getAttribute('data-stage') === 'producing', null, { timeout: 20000 });
  await desktop.getByRole('dialog').getByText('"52"', { exact: true }).waitFor();
  assert.equal(await desktop.getByRole('dialog').getByText('number', { exact: true }).count(), 2, 'results appear as soon as tests finish, while the panel stays open');
  await desktop.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.getAttribute('data-stage') === 'complete', null, { timeout: 30000 });
  assert.equal(await desktop.getByTestId('courier').count(), 0, 'messenger leaves after delivery');
  const panel = desktop.getByRole('dialog');
  await panel.getByText('"52"', { exact: true }).waitFor();
  await panel.getByText('string', { exact: true }).waitFor();
  await panel.getByText('7', { exact: true }).waitFor();
  assert.equal(await panel.getByText('number', { exact: true }).count(), 2);
  await capture(desktop, 'escritorio-pruebas');
  await desktop.getByRole('button', { name: /Cerrar panel/ }).click();
  assert.ok(await desktop.getByTestId('demo-start').isEnabled(), 'demo can run again');
  await desktop.getByRole('button', { name: /^(Abrir )?Voz$/ }).first().click();
  await desktop.getByRole('dialog').getByText('ElevenLabs pendiente de conexión', { exact: true }).waitFor();
  await desktop.getByRole('button', { name: /Cerrar panel/ }).click();
  await desktop.getByRole('button', { name: /^(Abrir )?Retención$/ }).first().click();
  await desktop.getByRole('dialog').getByText('Sin datos', { exact: true }).first().waitFor();
  await desktop.getByRole('button', { name: /Cerrar panel/ }).click();
  await desktop.getByRole('button', { name: /^(Abrir )?Publicación$/ }).first().click();
  const downloadEvent = desktop.waitForEvent('download');
  await desktop.getByRole('button', { name: /Descargar borrador/ }).click();
  const download = await downloadEvent;
  const filePath = await download.path();
  const { readFile } = await import('node:fs/promises');
  const draft = JSON.parse(await readFile(filePath, 'utf8'));
  assert.equal(draft.status, 'draft');
  assert.equal(draft.tests[0].value, '52');
  await desktop.getByRole('button', { name: /Cerrar panel/ }).click();

  const saved = await desktop.evaluate(() => JSON.parse(localStorage.getItem('codex-studio:draft:v1')));
  assert.equal(saved.results.length, 3, 'completed draft is stored locally');
  await desktop.reload({ waitUntil: 'networkidle' });
  await desktop.getByRole('button', { name: /^(Abrir )?Publicación$/ }).first().click();
  await desktop.getByRole('dialog').getByText('Borrador recuperado', { exact: true }).waitFor();
  await desktop.getByRole('button', { name: /Cerrar panel/ }).click();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await verifyPage(mobile);
  await capture(mobile, 'movil-inicial');
  await mobile.getByRole('button', { name: /^(Abrir )?Pruebas$/ }).first().click();
  await mobile.getByRole('dialog').waitFor();
  await capture(mobile, 'movil-panel');
  const bounds = await mobile.getByRole('dialog').boundingBox();
  assert.ok(bounds.y > 100, 'mobile bottom sheet keeps part of office visible');
  assert.ok(bounds.y + bounds.height <= 845, 'mobile sheet fits viewport');
  await mobile.getByRole('button', { name: /Cerrar panel/ }).click();
  await mobile.getByTestId('demo-start').click();
  await mobile.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.getAttribute('data-stage') === 'complete', null, { timeout: 40000 });
  await mobile.getByRole('button', { name: /^(Abrir )?Edición$/ }).first().click();
  await mobile.getByRole('dialog').waitFor();
  await mobile.locator('.short-preview').scrollIntoViewIfNeeded();
  await capture(mobile, 'movil-edicion');
  const screen = mobile.locator('.short-screen');
  assert.equal(await screen.getAttribute('data-shot'), '0', 'question comes first');
  await mobile.getByRole('button', { name: 'Reproducir Short', exact: true }).click();
  await mobile.waitForFunction(() => document.querySelector('.short-screen')?.getAttribute('data-shot') === '1', null, { timeout: 8000 });
  await screen.getByText('"52"', { exact: true }).waitFor();
  await mobile.getByRole('button', { name: 'Pausar Short', exact: true }).click();
  await capture(mobile, 'movil-respuesta');
  await mobile.getByRole('button', { name: 'Reiniciar Short', exact: true }).click();
  assert.equal(await screen.getAttribute('data-shot'), '0', 'preview can be reset');

  assert.deepEqual(errors, [], 'no browser runtime errors');
  await writeFile(`${captures}resultado.json`, JSON.stringify({ baseURL, checkedAt: new Date().toISOString(), desktop: '1440 × 1000', mobile: '390 × 844', errors, passed: true }, null, 2));
  console.log('PASS: desktop/mobile; live results; repeated clicks; replay; bottom sheet; no runtime errors.');
} finally {
  await browser.close();
}
