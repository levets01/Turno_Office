import type { StationId } from './commerce'

/** Tupla [X, Y, Z] compatible con las props de Three.js, compartida por escena y pruebas. */
export type Vec3 = [number, number, number]

// Origen de cada puesto: X separa ambos lados, Y eleva las filas y Z ordena fondo/frente.
// Mover estos valores mueve el conjunto de escritorio y robot, además de sus límites físicos.
// Si cambias la distribución, revisa también COURIER_ROUTE para conservar el pasillo despejado.
export const STATION_POSITIONS: Record<StationId, Vec3> = {
  products: [-4.15, 1.08, -4.35], analytics: [4.15, 1.08, -4.35],
  suppliers: [-4.15, 0.76, -1.65], orders: [4.15, 0.76, -1.65],
  profitability: [-4.15, 0.44, 1.05], support: [4.15, 0.44, 1.05],
  catalog: [-4.15, 0.12, 3.75], advertising: [4.15, 0.12, 3.75],
}

// Dimensiones [ancho, alto, profundidad] en las mismas unidades de la escena.
export const DESK_SIZE: Vec3 = [3, 0.12, 1]
export const PLATFORM_SIZE: Vec3 = [3.2, 0.16, 2.65]
