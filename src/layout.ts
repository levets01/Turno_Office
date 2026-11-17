import type { StationId } from './demo'

/** Shared, mutable Three.js tuples used by both the scene and collision checks. */
export type Vec3 = [number, number, number]

export const STATION_POSITIONS: Record<StationId, Vec3> = {
  tendencias: [-4.15, 1.08, -4.35], retencion: [4.15, 1.08, -4.35],
  voz: [-4.15, 0.76, -1.65], publicacion: [4.15, 0.76, -1.65],
  guion: [-4.15, 0.44, 1.05], edicion: [4.15, 0.44, 1.05],
  portada: [-4.15, 0.12, 3.75], pruebas: [4.15, 0.12, 3.75],
}

export const DESK_SIZE: Vec3 = [3, 0.12, 1]
export const PLATFORM_SIZE: Vec3 = [3.2, 0.16, 2.65]
