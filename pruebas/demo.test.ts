import test from 'node:test';
import assert from 'node:assert/strict';
import { computeResults, stageAt, DEMO_TIMING, EPISODE } from '../src/demo';

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
