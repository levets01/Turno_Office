/**
 * Recorrido y límites físicos del mensajero. La escena usa sampleRoute para animarlo
 * y las pruebas comparan su trayectoria con los muebles definidos en layout.ts.
 */
import { DESK_SIZE, PLATFORM_SIZE, STATION_POSITIONS } from './layout'

/** Puntos [X, Y, Z] del mundo: salida junto a Guion, centro del pasillo y llegada a Pruebas.
 * Y se mantiene en 0.12 para apoyar los pies en el mismo suelo durante todo el trayecto.
 */
export const COURIER_ROUTE: [number, number, number][] = [
  [-2.05, 0.12, 1.45], [0, 0.12, 1.45], [0, 0.12, 4.15], [2.05, 0.12, 4.15],
]
// Radio reservado alrededor del centro del robot para comprobar el espacio libre.
export const COURIER_RADIUS = 0.38
// Rectángulos de las mesas vistos desde arriba. El tablero está adelantado +0.4 en Z.
export const DESK_BOUNDS = Object.values(STATION_POSITIONS).map(([x, , z]) => ({
  minX: x - DESK_SIZE[0] / 2, maxX: x + DESK_SIZE[0] / 2,
  minZ: z + 0.4 - DESK_SIZE[2] / 2, maxZ: z + 0.4 + DESK_SIZE[2] / 2,
}))
// Las plataformas también ocupan espacio: sus bordes se comprueban por separado.
export const PLATFORM_BOUNDS = Object.values(STATION_POSITIONS).map(([x, , z]) => ({
  minX: x - PLATFORM_SIZE[0] / 2, maxX: x + PLATFORM_SIZE[0] / 2,
  minZ: z - PLATFORM_SIZE[2] / 2, maxZ: z + PLATFORM_SIZE[2] / 2,
}))
/** progress va de 0 (recogida) a 1 (entrega); devuelve posición y orientación en radianes. */
export function sampleRoute(progress: number) {
  // Medir cada tramo permite recorrer la ruta a velocidad uniforme aunque tengan longitudes distintas.
  const lengths = COURIER_ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - COURIER_ROUTE[i][0], p[2] - COURIER_ROUTE[i][2]))
  // Se limita el progreso al recorrido y se convierte en distancia desde el inicio.
  let remaining = Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0)
  // Resta los tramos ya recorridos hasta encontrar aquel donde debe estar el robot.
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      // Interpolación lineal dentro del tramo; atan2 orienta el frente +Z del robot hacia el destino.
      const p = COURIER_ROUTE[i], q = COURIER_ROUTE[i + 1], t = remaining / lengths[i]
      return { position: [p[0] + (q[0] - p[0]) * t, p[1], p[2] + (q[2] - p[2]) * t] as [number, number, number], angle: Math.atan2(q[0] - p[0], q[2] - p[2]) }
    }
    remaining -= lengths[i]
  }
  return { position: COURIER_ROUTE[0], angle: 0 }
}
