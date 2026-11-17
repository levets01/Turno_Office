import { DESK_SIZE, PLATFORM_SIZE, STATION_POSITIONS } from './layout'

/** World coordinates: the courier stays on the continuous, level central aisle. */
export const COURIER_ROUTE: [number, number, number][] = [
  [-2.05, 0.12, 1.45], [0, 0.12, 1.45], [0, 0.12, 4.15], [2.05, 0.12, 4.15],
]
export const COURIER_RADIUS = 0.38
export const DESK_BOUNDS = Object.values(STATION_POSITIONS).map(([x, , z]) => ({
  minX: x - DESK_SIZE[0] / 2, maxX: x + DESK_SIZE[0] / 2,
  minZ: z + 0.4 - DESK_SIZE[2] / 2, maxZ: z + 0.4 + DESK_SIZE[2] / 2,
}))
export const PLATFORM_BOUNDS = Object.values(STATION_POSITIONS).map(([x, , z]) => ({
  minX: x - PLATFORM_SIZE[0] / 2, maxX: x + PLATFORM_SIZE[0] / 2,
  minZ: z - PLATFORM_SIZE[2] / 2, maxZ: z + PLATFORM_SIZE[2] / 2,
}))
export function sampleRoute(progress: number) {
  const lengths = COURIER_ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - COURIER_ROUTE[i][0], p[2] - COURIER_ROUTE[i][2]))
  let remaining = Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0)
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const p = COURIER_ROUTE[i], q = COURIER_ROUTE[i + 1], t = remaining / lengths[i]
      return { position: [p[0] + (q[0] - p[0]) * t, p[1], p[2] + (q[2] - p[2]) * t] as [number, number, number], angle: Math.atan2(q[0] - p[0], q[2] - p[2]) }
    }
    remaining -= lengths[i]
  }
  return { position: COURIER_ROUTE[0], angle: 0 }
}
