import type { StationId } from './demo'

/** Tupla [X, Y, Z] compatible con las props de Three.js, compartida por escena y pruebas. */
export type Vec3 = [number, number, number]

// Origen de cada puesto: X separa ambos lados, Y eleva las filas y Z ordena fondo/frente.
// Mover estos valores mueve el conjunto de escritorio y robot, además de sus límites físicos.
// Si cambias la distribución, revisa también COURIER_ROUTE para conservar el pasillo despejado.
export const STATION_POSITIONS: Record<StationId, Vec3> = {
  tendencias: [-4.15, 1.08, -4.35], retencion: [4.15, 1.08, -4.35],
  voz: [-4.15, 0.76, -1.65], publicacion: [4.15, 0.76, -1.65],
  guion: [-4.15, 0.44, 1.05], edicion: [4.15, 0.44, 1.05],
  portada: [-4.15, 0.12, 3.75], pruebas: [4.15, 0.12, 3.75],
}

// Dimensiones [ancho, alto, profundidad] en las mismas unidades de la escena.
export const DESK_SIZE: Vec3 = [3, 0.12, 1]
export const PLATFORM_SIZE: Vec3 = [3.2, 0.16, 2.65]
