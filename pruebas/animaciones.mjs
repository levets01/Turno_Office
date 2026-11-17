import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Uses the existing development renderer to inspect actual animated joints.
// This adds no testing hooks or globals to application source.
const baseURL = process.env.STUDIO_URL ?? 'http://127.0.0.1:5173';
const captures = fileURLToPath(new URL('./capturas/', import.meta.url));
await mkdir(captures, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const evidence = {};
async function open(viewport, mobile = false, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.locator('canvas').waitFor();
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(name => name.includes('/@react-three_fiber.js'));
    if (!url) throw new Error('This animation inspection requires the Vite dev server (npm run dev).');
    const fiber = await import(url);
    window.__turnoQAScene = fiber._roots.get(document.querySelector('canvas')).store.getState().scene;
  });
  await page.waitForFunction(() => !!window.__turnoQAScene.getObjectByName('robot-tester'));
  return page;
}
async function state(page, personality) {
  return page.evaluate(name => {
    const robot = window.__turnoQAScene.getObjectByName(`robot-${name}`);
    if (!robot) return null;
    const joints = {};
    for (const key of ['head', 'upper-body', 'left-arm', 'right-arm', 'left-leg', 'right-leg']) {
      const joint = robot.getObjectByName(key);
      if (joint) joints[key] = { rotation: joint.rotation.toArray().slice(0, 3), position: joint.position.toArray() };
    }
    return { ...robot.userData, joints };
  }, personality);
}
async function waitGesture(page, personality, gesture, timeout = 8000) {
  await page.waitForFunction(({ personality, gesture }) => window.__turnoQAScene.getObjectByName(`robot-${personality}`)?.userData.gesture === gesture, { personality, gesture }, { timeout });
}
async function capture(page, name) {
  await page.screenshot({ path: `${captures}${name}.png`, fullPage: true });
  console.log('Captured', name);
}
try {
  const desktop = await open({ width: 1440, height: 1000 });
  assert.equal(await desktop.evaluate(() => {
    const robots=[]; window.__turnoQAScene.traverse(o => { if(o.name.startsWith('robot-')) robots.push(o); }); return robots.length;
  }), 8);
  evidence.idleStart = await state(desktop, 'voice');
  await desktop.waitForTimeout(800);
  evidence.idleLater = await state(desktop, 'voice');
  assert.notDeepEqual(evidence.idleStart.joints, evidence.idleLater.joints, 'idle robots have visible joint motion');

  await desktop.getByRole('button', { name: 'Pruebas', exact: true }).click();
  await waitGesture(desktop, 'tester', 'wave');
  await desktop.waitForTimeout(450);
  evidence.wave = await state(desktop, 'tester');
  await capture(desktop, 'robots-saludo-escritorio');
  await desktop.waitForTimeout(2800);
  assert.notEqual((await state(desktop, 'tester')).gesture, 'wave', 'greeting ends without looping');
  await desktop.getByRole('button', { name: 'Pruebas', exact: true }).click();
  await waitGesture(desktop, 'tester', 'wave');
  await desktop.getByRole('button', { name: /Cerrar panel/ }).click();
  await desktop.getByTestId('demo-start').click();
  await desktop.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.dataset.stage === 'walking', null, { timeout: 15000 });
  assert.equal(await desktop.getByTestId('courier').count(), 1);
  evidence.courier = await state(desktop, 'courier');
  assert.equal(evidence.courier.mode, 'walking');
  await desktop.getByRole('button', { name: 'Pruebas', exact: true }).click();
  await desktop.waitForFunction(() => document.querySelector('[data-testid="stage"]')?.dataset.stage === 'producing', null, { timeout: 20000 });
  await waitGesture(desktop, 'tester', 'celebrate');
  evidence.celebration = await state(desktop, 'tester');
  await capture(desktop, 'robots-celebracion');
  await desktop.getByRole('dialog').getByText('"52"', { exact: true }).waitFor();
  await desktop.waitForTimeout(2900);
  assert.notEqual((await state(desktop, 'tester')).gesture, 'celebrate', 'completed task celebrates once');
  await desktop.waitForTimeout(1000);
  assert.notEqual((await state(desktop, 'tester')).gesture, 'celebrate', 'remaining completed does not restart celebration');
  await desktop.close();

  const mobile = await open({ width: 390, height: 844 }, true);
  await mobile.getByRole('button', { name: 'Voz', exact: true }).click();
  await waitGesture(mobile, 'voice', 'wave');
  await mobile.waitForTimeout(750);
  await capture(mobile, 'robots-saludo-movil');
  assert.ok((await mobile.getByRole('dialog').boundingBox()).y > 150);
  await mobile.close();

  const reduced = await open({ width: 1100, height: 820 }, false, 'reduce');
  await reduced.waitForTimeout(1200);
  evidence.reducedStart = await state(reduced, 'voice');
  await reduced.waitForTimeout(750);
  evidence.reducedLater = await state(reduced, 'voice');
  for (const name of Object.keys(evidence.reducedStart.joints)) {
    const before = evidence.reducedStart.joints[name], after = evidence.reducedLater.joints[name];
    before.rotation.forEach((v, i) => assert.ok(Math.abs(v - after.rotation[i]) < .002, `reduced motion keeps ${name} still`));
  }
  await reduced.close();
  assert.deepEqual(errors, []);
  await writeFile(`${captures}animaciones-resultado.json`, JSON.stringify({ baseURL, passed: true, errors, evidence }, null, 2));
  console.log('PASS: greeting/reselection, finite celebrations, idle movement, courier priority, mobile and reduced motion.');
} finally { await browser.close(); }
