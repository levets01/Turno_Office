import test from 'node:test';
import assert from 'node:assert/strict';
import { computeResults, stageAt, DEMO_TIMING, EPISODE } from '../src/demo';
import { calculateProfit, executeAllAgentTasks, emptyStore, retryTask } from '../src/commerce';

test('JavaScript operations produce actual values and distinguish text from numbers', () => {
  const results = computeResults();
  assert.deepEqual(results, [
    { expression: '"5" + 2', value: '52', type: 'string' },
    { expression: '"5" - 2', value: 3, type: 'number' },
    { expression: 'Number("5") + 2', value: 7, type: 'number' },
  ]);
  results.forEach(result => assert.equal(typeof result.value, result.type));
  results[0].value = 'changed';
  assert.equal(computeResults()[0].value, '52', 'runs do not share mutable results');
});

test('one episode moves in order through writing, pickup, aisle, tests and production', () => {
  const states = Array.from({ length: 221 }, (_, tick) => stageAt(tick / 10));
  const transitions = states.filter((state, index) => state !== states[index - 1]);
  assert.deepEqual(transitions, ['writing', 'pickup', 'walking', 'testing', 'producing', 'complete']);
  assert.equal(stageAt(DEMO_TIMING.pickup), 'walking');
  assert.equal(stageAt(DEMO_TIMING.walking), 'testing');
  assert.equal(stageAt(DEMO_TIMING.testing), 'producing');
  assert.equal(stageAt(DEMO_TIMING.total), 'complete');
  assert.equal(EPISODE.draft, true);
});

test('commerce profit is deterministic and identifies missing values', () => {
  const store = emptyStore();
  const profit = calculateProfit(store.products[0]);
  assert.equal(profit.revenueCOP, 140000);
  assert.equal(profit.grossContributionCOP, 52000);
  assert.equal(profit.marginPercent, 37.14);
  assert.ok(calculateProfit({ ...store.products[0], salePriceCOP: 0 }).missing.includes('Precio de venta'));
});

test('all agents create persistent task records and failed work can be retried', () => {
  const ran = executeAllAgentTasks(emptyStore());
  assert.equal(ran.tasks.length, 8);
  assert.equal(ran.tasks.every(task => task.status === 'completed'), true);
  const failed = { ...ran, tasks: ran.tasks.map((task, index) => index === 0 ? { ...task, status: 'failed' as const, error: 'Fallo controlado' } : task) };
  const retried = retryTask(failed, failed.tasks[0].id);
  assert.equal(retried.tasks[0].status, 'completed');
  assert.equal(retried.tasks[0].attempts, failed.tasks[0].attempts + 1);
});
