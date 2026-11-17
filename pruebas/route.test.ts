import test from 'node:test';
import assert from 'node:assert/strict';
import { COURIER_ROUTE, COURIER_RADIUS, DESK_BOUNDS, PLATFORM_BOUNDS, sampleRoute } from '../src/route';

test('courier has enough clearance from all eight desks along the complete route', () => {
  assert.equal(DESK_BOUNDS.length, 8);
  for (let step = 0; step <= 1000; step++) {
    const { position: [x, y, z] } = sampleRoute(step / 1000);
    assert.equal(y, 0.12, 'feet stay on the level aisle');
    for (const desk of DESK_BOUNDS) {
      const dx = Math.max(desk.minX - x, 0, x - desk.maxX);
      const dz = Math.max(desk.minZ - z, 0, z - desk.maxZ);
      assert.ok(Math.hypot(dx, dz) >= COURIER_RADIUS, `desk collision at progress ${step / 1000}`);
    }
  }
});

test('courier also clears the full raised platforms rendered in the office', () => {
  assert.equal(PLATFORM_BOUNDS.length, 8);
  for (let step = 0; step <= 1000; step++) {
    const { position: [x, , z] } = sampleRoute(step / 1000);
    for (const platform of PLATFORM_BOUNDS) {
      const dx = Math.max(platform.minX - x, 0, x - platform.maxX);
      const dz = Math.max(platform.minZ - z, 0, z - platform.maxZ);
      assert.ok(Math.hypot(dx, dz) >= COURIER_RADIUS, `platform collision at progress ${step / 1000}`);
    }
  }
});

test('courier starts by Guion, ends beside Pruebas and clamps out-of-range progress', () => {
  assert.deepEqual(sampleRoute(0).position, COURIER_ROUTE[0]);
  const destination = COURIER_ROUTE.at(-1)!;
  sampleRoute(1).position.forEach((value, axis) => assert.ok(Math.abs(value - destination[axis]) < 1e-8));
  assert.deepEqual(sampleRoute(-0.5), sampleRoute(0));
  assert.deepEqual(sampleRoute(2), sampleRoute(1));
  assert.ok(COURIER_ROUTE[0][0] < 0 && destination[0] > 0);
});

test('walking speed remains continuous through both turns', () => {
  let previous = sampleRoute(0).position;
  for (let step = 1; step <= 1000; step++) {
    const current = sampleRoute(step / 1000).position;
    const distance = Math.hypot(current[0] - previous[0], current[2] - previous[2]);
    assert.ok(distance > 0 && distance <= 0.007, 'courier cannot teleport at path corners');
    previous = current;
  }
});
