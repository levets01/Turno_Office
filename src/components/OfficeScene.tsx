import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { BoxGeometry, PlaneGeometry, CylinderGeometry, SphereGeometry, MeshStandardMaterial, CanvasTexture, SRGBColorSpace, Group, MathUtils, Vector3, type OrthographicCamera } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import RobotCodex from './RobotCodex'
import { STATIONS, type StationId, type TestResult, type useDemo } from '../demo'
import { sampleRoute } from '../route'
import { STATION_POSITIONS, DESK_SIZE, PLATFORM_SIZE, type Vec3 } from '../layout'

export { STATION_POSITIONS } from '../layout'

type Demo = ReturnType<typeof useDemo>
const geo = {
  box: new BoxGeometry(1, 1, 1), rounded: new RoundedBoxGeometry(1, 1, 1, 2, 0.08),
  plane: new PlaneGeometry(1, 1), cylinder: new CylinderGeometry(1, 1, 1, 12),
  sphere: new SphereGeometry(1, 10, 8), shade: new CylinderGeometry(0.12, 0.25, 0.22, 12),
}
const mat = {
  paper: new MeshStandardMaterial({ color: '#e7ddc5', roughness: 1 }),
  orange: new MeshStandardMaterial({ color: '#de936c', roughness: 0.85 }),
  blue: new MeshStandardMaterial({ color: '#7e9fa8', roughness: 0.9 }),
  blush: new MeshStandardMaterial({ color: '#b18687', roughness: 0.9 }),
  wall: new MeshStandardMaterial({ color: '#1e344e', roughness: 0.9 }),
  wallTrim: new MeshStandardMaterial({ color: '#304659', roughness: 0.7 }),
  wood: new MeshStandardMaterial({ color: '#a67c56', roughness: 0.85 }),
  floor: new MeshStandardMaterial({ color: '#795f48', roughness: 1 }),
  edge: new MeshStandardMaterial({ color: '#3f4540', roughness: 0.8 }),
  grain: new MeshStandardMaterial({ color: '#624e3d', roughness: 1 }),
  dark: new MeshStandardMaterial({ color: '#142022', roughness: 0.45 }),
  metal: new MeshStandardMaterial({ color: '#5e706e', roughness: 0.55, metalness: 0.3 }),
  ivory: new MeshStandardMaterial({ color: '#e4d5b4', roughness: 0.7 }),
  rug: new MeshStandardMaterial({ color: '#344b4d', roughness: 1 }),
  leaf: new MeshStandardMaterial({ color: '#609d7c', roughness: 0.9 }),
  pot: new MeshStandardMaterial({ color: '#b17d5e', roughness: 1 }),
  light: new MeshStandardMaterial({ color: '#fbe4ad', emissive: '#ffc979', emissiveIntensity: 1.4 }),
  mint: new MeshStandardMaterial({ color: '#a6edcc', emissive: '#6cc99f', emissiveIntensity: 0.6 }),
  night: new MeshStandardMaterial({ color: '#101e39', emissive: '#152b4a', emissiveIntensity: 0.4 }),
  city: new MeshStandardMaterial({ color: '#243a55', roughness: 1 }),
}
function Block({ position, scale, material = mat.dark, rotation, rounded = false, castShadow = false }: { position?: Vec3; scale?: Vec3; material?: MeshStandardMaterial; rotation?: Vec3; rounded?: boolean; castShadow?: boolean }) {
  return <mesh geometry={rounded ? geo.rounded : geo.box} position={position} scale={scale} rotation={rotation} material={material} castShadow={castShadow} receiveShadow dispose={null} />
}

function screenTexture(id: StationId, stage: string, results: TestResult[], status: string) {
  const ready = results.length > 0
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 320
  const c = canvas.getContext('2d')!
  const station = STATIONS.find(s => s.id === id)!
  const accent = station.accent
  c.fillStyle = '#101e26'; c.fillRect(0, 0, 512, 320)
  c.fillStyle = '#20323a'; c.fillRect(0, 0, 512, 42)
  c.fillStyle = accent; c.beginPath(); c.arc(23, 21, 5, 0, Math.PI * 2); c.fill()
  c.font = '600 16px monospace'; c.fillStyle = '#bdd4d5'; c.fillText(station.name.toUpperCase(), 41, 27)
  c.fillStyle = '#78a293'; c.fillText(stage === 'idle' ? 'STUDIO / 01' : 'SHORT / 001', 341, 27)
  if (id === 'pruebas') {
    c.font = '17px monospace'; c.fillStyle = '#78a293'; c.fillText('> coerción de tipos', 27, 82)
    const lines = ready ? results.map(r => `${r.expression}  →  ${JSON.stringify(r.value)}`) : ['const short = {', '  idea: "¿7 o 52?",', '  status: "listo para probar"', '}']
    lines.forEach((line, i) => { c.fillStyle = i === 0 && ready ? '#f1b5d1' : '#9ce7cb'; c.font = `${ready ? 25 : 20}px monospace`; c.fillText(line, 27, 133 + i * 41) })
    if (ready) { c.fillStyle = '#c2d5cd'; c.font = '15px monospace'; c.fillText('✓  3 expresiones verificadas', 27, 286) }
  } else if (id === 'guion') {
    c.fillStyle = '#92aeac'; c.font = '17px monospace'; c.fillText('EL GANCHO', 30, 88)
    c.fillStyle = '#f2eadb'; c.font = 'bold 34px sans-serif'; c.fillText('¿Por qué "5" + 2', 30, 143); c.fillText('da "52"?', 30, 188)
    c.fillStyle = '#91d7b9'; c.font = '19px sans-serif'; c.fillText(stage === 'writing' ? 'Escribiendo una buena historia…' : 'Una pregunta. Un gran Short.', 30, 263)
  } else if (id === 'portada' && ready) {
    c.fillStyle = '#d3b68b'; c.fillRect(40, 60, 432, 228)
    c.fillStyle = '#263e3a'; c.font = 'bold 27px sans-serif'; c.fillText('JAVASCRIPT', 78, 113)
    c.font = 'bold 72px sans-serif'; c.fillText('¿7 o 52?', 74, 205)
    c.fillStyle = '#4a6559'; c.font = '17px monospace'; c.fillText('LA MAGIA DE LOS TIPOS', 80, 253)
  } else if (id === 'voz') {
    for (let i = 0; i < 47; i++) { const h = (0.15 + Math.abs(Math.sin(i * 0.73) * Math.cos(i * 0.24))) * 118; c.fillStyle = i % 3 ? '#8bcbbf' : '#edc79c'; c.fillRect(28 + i * 10, 153 - h / 2, 5, h) }
    c.font = '18px monospace'; c.fillStyle = '#afc6c2'; c.fillText('ElevenLabs · pendiente', 28, 245); c.font = '13px monospace'; c.fillStyle = '#7d9a92'; c.fillText('FORMA DE ONDA DE EJEMPLO · SIN AUDIO', 28, 273)
  } else if (id === 'edicion' && ready) {
    c.fillStyle = '#304d50'; c.fillRect(28, 65, 140, 160); c.fillStyle = '#b1e4cd'; c.font = 'bold 40px sans-serif'; c.fillText('"5"', 63, 129); c.fillText('+ 2', 61, 180)
    c.fillStyle = '#9ab9ad'; c.font = '18px monospace'; c.fillText('SECUENCIA 9:16', 194, 94); c.fillText('01 / pregunta', 194, 134); c.fillText('02 / respuesta', 194, 172)
    for (let i = 0; i < 3; i++) { c.fillStyle = ['#7db9a2', '#a99bca', '#b29c77'][i]; c.fillRect(28 + i * 156, 250, 145, 30) }
  } else if (id === 'portada' || id === 'edicion') {
    c.strokeStyle = '#66887b'; c.lineWidth = 2; c.setLineDash([8, 8]); c.strokeRect(205, 67, 100, 170); c.setLineDash([])
    c.fillStyle = '#b9d2c6'; c.font = 'bold 35px sans-serif'; c.fillText(id === 'portada' ? 'Aa' : '9:16', 219, 168)
    c.font = '18px sans-serif'; c.fillText('Esperando pruebas', 176, 274)
  } else if (id === 'publicacion') {
    c.fillStyle = '#eaad9d'; c.beginPath(); c.roundRect(186, 82, 140, 96, 24); c.fill(); c.fillStyle = '#263530'; c.beginPath(); c.moveTo(244, 106); c.lineTo(244, 154); c.lineTo(283, 130); c.fill()
    c.fillStyle = '#e9e7dc'; c.font = 'bold 27px sans-serif'; c.fillText(stage === 'idle' ? 'Tu próximo estreno' : 'Borrador local', 128, 238)
    c.fillStyle = '#7d9a92'; c.font = '17px sans-serif'; c.fillText('YouTube · sin conectar', 163, 277)
  } else {
    const noData = id === 'retencion'
    c.strokeStyle = '#2b4549'; c.lineWidth = 2
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(30, 92 + i * 47); c.lineTo(480, 92 + i * 47); c.stroke() }
    if (!noData) { c.strokeStyle = '#a0e0bb'; c.lineWidth = 5; c.beginPath(); for (let i = 0; i < 11; i++) { const y = 215 - i * 11 - Math.sin(i * 1.9) * 26; i ? c.lineTo(30 + i * 44, y) : c.moveTo(30, y) } c.stroke() }
    c.fillStyle = '#cde4d7'; c.font = 'bold 27px sans-serif'; c.fillText(noData ? 'Sin datos' : 'Ideas en tendencia ↗', 34, 281)
    if (!noData) { c.font = '14px monospace'; c.fillStyle = '#bbad87'; c.fillText('DATOS DE EJEMPLO', 31, 68) }
  }
  c.fillStyle = '#182c2b'; c.fillRect(0, 296, 512, 24); c.font = '13px monospace'; c.fillStyle = '#91b9a4'; c.fillText(status.toUpperCase(), 22, 313)
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace
  return texture
}

function Monitor({ id, demo, onSelect }: { id: StationId; demo: Demo; onSelect: (id: StationId) => void }) {
  const status = demo.getStatus(id).label
  const texture = useMemo(() => screenTexture(id, demo.stage, demo.results, status), [id, demo.stage, demo.results, status])
  useEffect(() => () => texture.dispose(), [texture])
  return <group position={[-0.63, 0, 0.33]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(id) }}>
    <Block position={[0, 0.79, 0]} scale={[0.47, 0.05, 0.27]} rounded />
    <Block position={[0, 1.01, -0.08]} scale={[0.085, 0.4, 0.085]} material={mat.metal} />
    <group position={[0, 1.25, -0.03]} rotation={[-0.12, 0, 0]}>
      <Block scale={[1.3, 0.86, 0.1]} rounded />
      <mesh geometry={geo.plane} position={[0, 0, 0.056]} scale={[1.19, 0.745, 1]}><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
      <Block position={[0.52, -0.39, 0.06]} scale={[0.025, 0.012, 0.01]} material={mat.mint} />
    </group>
  </group>
}

function DeskLamp({ mirrored = false }: { mirrored?: boolean }) {
  return <group position={[mirrored ? 1.25 : -1.25, 0.79, 0.34]}>
    <mesh geometry={geo.cylinder} material={mat.metal} scale={[0.15, 0.04, 0.15]} />
    <Block position={[0, 0.28, 0]} scale={[0.035, 0.55, 0.035]} rotation={[0, 0, -0.16]} material={mat.metal} />
    <Block position={[0.12, 0.55, 0.02]} scale={[0.33, 0.035, 0.035]} rotation={[0, 0, -0.2]} material={mat.metal} />
    <mesh geometry={geo.shade} position={[0.28, 0.49, 0.02]} material={mat.dark} />
    <mesh geometry={geo.cylinder} position={[0.28, 0.382, 0.02]} scale={[0.21, 0.012, 0.21]} material={mat.light} />
  </group>
}

function Station({ id, demo, onSelect }: { id: StationId; demo: Demo; onSelect: (id: StationId) => void }) {
  const station = STATIONS.find(s => s.id === id)!
  const status = demo.getStatus(id)
  const p = STATION_POSITIONS[id]
  return <group position={p} onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'auto' }}>
    <Block position={[0, -0.08, 0]} scale={PLATFORM_SIZE} material={mat.wood} />
    {p[1] > 0.2 && <Block position={[0, -p[1] / 2 - 0.01, 0]} scale={[PLATFORM_SIZE[0], p[1] - 0.08, PLATFORM_SIZE[2]]} material={mat.edge} />}
    <Block position={[0, 0.01, 0.15]} scale={[3.05, 0.025, 2.13]} material={mat.rug} rounded />
    <group onClick={(e) => { e.stopPropagation(); onSelect(id) }}>
      <Block position={[0, 0.73, 0.4]} scale={DESK_SIZE} material={mat.wood} rounded castShadow />
      {[-1.3, 1.3].map(x => <Block key={x} position={[x, 0.36, 0.4]} scale={[0.075, 0.71, 0.78]} material={mat.dark} />)}
      <Block position={[0.55, 0.81, 0.10]} scale={[0.95, 0.035, 0.26]} material={mat.dark} rounded />
      {[0, 1, 2].map(i => <Block key={i} position={[0.55, 0.831, 0.02 + i * 0.07]} scale={[0.82, 0.005, 0.018]} material={mat.metal} />)}
      <Block position={[1.26, 0.81, 0.37]} scale={[0.13, 0.06, 0.18]} material={mat.ivory} rounded />
      <mesh geometry={geo.cylinder} material={mat.ivory} position={[1.1, 0.9, 0.75]} scale={[0.085, 0.22, 0.085]} />
      <mesh geometry={geo.cylinder} material={mat.grain} position={[1.1, 1.015, 0.75]} scale={[0.065, 0.008, 0.065]} />
      <DeskLamp />
      <Monitor id={id} demo={demo} onSelect={onSelect} />
      <DeskDetails id={id} />
    </group>
    <RobotCodex color={station.accent} position={[0.6, 0.035, -0.29]} rotation={[0, -0.12, 0]} mode={id === 'guion' && demo.stage === 'pickup' ? 'delivering' : status.kind === 'working' ? 'working' : 'idle'} showCard={false} accessory={id === 'voz' ? 'headset' : id === 'pruebas' ? 'glasses' : 'none'} onClick={() => onSelect(id)} />
  </group>
}

/** Small, different tools make each desk feel used rather than duplicated. */
function DeskDetails({ id }: { id: StationId }) {
  if (id === 'guion') return <group position={[0.18, 0.81, 0.73]} rotation={[0, -0.13, 0]}>
    <Block scale={[0.5, 0.015, 0.27]} material={mat.paper} />
    {[0, 1, 2].map(i => <Block key={i} position={[-0.04, 0.01, -0.07 + i * 0.05]} scale={[0.28 - i * 0.03, 0.003, 0.006]} material={mat.metal} />)}
    <Block position={[0.28, 0.01, 0]} rotation={[0, 0.18, 0]} scale={[0.025, 0.025, 0.27]} material={mat.orange} />
  </group>
  if (id === 'portada') return <group position={[0.25, 0.81, 0.73]}>{[mat.orange, mat.blue, mat.blush].map((material, i) => <Block key={i} position={[i * 0.18, i * 0.01, 0]} scale={[0.3, 0.018, 0.22]} rotation={[0, 0.13 - i * 0.1, 0]} material={material} />)}</group>
  if (id === 'pruebas') return <group position={[0.05, 0.82, 0.75]}><Block scale={[0.65, 0.055, 0.18]} material={mat.dark} rounded />{[0, 1, 2].map(i => <Block key={i} position={[-0.2 + i * 0.2, 0.03, 0]} scale={[0.08, 0.015, 0.06]} material={mat.mint} />)}</group>
  if (id === 'voz') return <group position={[0.15, 0.81, 0.72]}><mesh geometry={geo.cylinder} material={mat.metal} scale={[0.13, 0.03, 0.13]} /><Block position={[0, 0.13, 0]} scale={[0.025, 0.27, 0.025]} material={mat.metal} /><mesh geometry={geo.sphere} material={mat.dark} position={[0, 0.3, 0]} scale={[0.095, 0.16, 0.095]} /></group>
  if (id === 'edicion') return <group position={[0.15, 0.83, 0.74]} rotation={[0, -0.13, 0]}><Block scale={[0.55, 0.05, 0.23]} material={mat.dark} />{[0, 1, 2, 3].map(i => <Block key={i} position={[-0.2 + i * 0.13, 0.031, 0]} scale={[0.06, 0.012, 0.2]} material={mat.ivory} />)}</group>
  return <group position={[0.15, 0.82, 0.74]} rotation={[0, 0.12, 0]}><Block scale={[0.53, 0.04, 0.25]} material={id === 'publicacion' ? mat.orange : mat.blue} /><Block position={[0, 0.025, 0]} scale={[0.46, 0.012, 0.21]} material={mat.paper} /></group>
}

function Plant({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  return <group position={position} scale={scale}>
    <mesh geometry={geo.cylinder} material={mat.pot} position={[0, 0.24, 0]} scale={[0.29, 0.47, 0.29]} />
    <Block position={[0, 0.68, 0]} scale={[0.035, 0.8, 0.035]} material={mat.leaf} />
    {[0, 1, 2, 3, 4].map((i) => <mesh key={i} geometry={geo.sphere} material={mat.leaf} position={[Math.sin(i * 2.4) * 0.22, 0.75 + i * 0.105, Math.cos(i * 2.4) * 0.14]} rotation={[0, 0, Math.sin(i * 2.4) * 0.8]} scale={[0.16, 0.35, 0.07]} />)}
  </group>
}
function Room() {
  const sign = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d')!
    x.fillStyle = '#20374d'; x.fillRect(0, 0, 1024, 256)
    x.textAlign = 'center'; x.fillStyle = '#e8e0cb'; x.font = '600 118px sans-serif'; x.fillText('TURNO.', 512, 137)
    x.font = '27px sans-serif'; x.fillStyle = '#a2b9ba'; x.fillText('Programación en corto / 01', 512, 202)
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t
  }, [])
  useEffect(() => () => sign.dispose(), [sign])
  return <group>
    <Block position={[0, -0.19, 0]} scale={[15.9, 0.5, 12.4]} material={mat.edge} rounded />
    <Block position={[0, 0.065, 0]} scale={[15.6, 0.1, 12.1]} material={mat.floor} />
    {Array.from({ length: 26 }, (_, i) => <Block key={i} position={[-7.5 + i * 0.6, 0.12, 0]} scale={[0.012, 0.008, 12]} material={mat.grain} />)}
    <Block position={[0, 2.65, -6.05]} scale={[15.9, 5.5, 0.22]} material={mat.wall} />
    <Block position={[-7.88, 1.9, -1.2]} scale={[0.2, 3.9, 9.9]} material={mat.wall} />
    <Block position={[0, 0.25, -5.86]} scale={[15.55, 0.25, 0.1]} material={mat.wallTrim} />
    <Block position={[-7.74, 0.25, -1.2]} scale={[0.1, 0.25, 9.5]} material={mat.wallTrim} />
    <Block position={[0, 5.35, -5.88]} scale={[15.8, 0.08, 0.12]} material={mat.wood} />
    <mesh geometry={geo.plane} position={[0, 4.12, -5.918]} scale={[4.35, 1.088, 1]}><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
    {/* Night window: all city elements are geometry, no image backdrop. */}
    <group position={[-4.85, 3.85, -5.88]}>
      <Block scale={[3.3, 2.02, 0.13]} material={mat.wood} rounded />
      <Block position={[0, 0, 0.08]} scale={[3.08, 1.8, 0.03]} material={mat.night} />
      {[0, 1, 2, 3, 4, 5, 6].map(i => <group key={i} position={[-1.33 + i * 0.42, -0.65, 0.11]}>
        <Block position={[0, i % 3 * 0.1, 0]} scale={[0.33, 0.5 + i % 3 * 0.2, 0.02]} material={mat.city} />
        {[0, 1].map(j => <Block key={j} position={[0.05, i % 3 * 0.1 + j * 0.14 - 0.02, 0.016]} scale={[0.048, 0.06, 0.008]} material={mat.light} />)}
      </group>)}
      <mesh geometry={geo.sphere} material={mat.ivory} position={[0.81, 0.48, 0.12]} scale={[0.16, 0.16, 0.025]} />
      <Block position={[0, 0, 0.16]} scale={[0.065, 1.85, 0.055]} material={mat.wallTrim} />
      <Block position={[0, -0.32, 0.16]} scale={[3.1, 0.065, 0.055]} material={mat.wallTrim} />
    </group>
    <group position={[4.9, 3.7, -5.8]}>
      <Block position={[0, -0.3, 0]} scale={[3.2, 0.11, 0.56]} material={mat.wood} />
      {[0, 1, 2, 3, 4].map(i => <Block key={i} position={[-1.05 + i * 0.21, -0.01, 0]} scale={[0.16, 0.46 + i % 2 * 0.13, 0.29]} material={i % 2 ? mat.ivory : mat.rug} rotation={[0, 0, i === 4 ? -0.12 : 0]} />)}
      <Plant position={[0.8, -0.24, 0]} scale={0.65} />
    </group>
    <Plant position={[-6.82, 0.14, 4.65]} scale={1.15} />
    <Plant position={[6.8, 0.14, -4.6]} scale={1.2} />
    {/* A clear central lane, subtly marked for the messenger. */}
    {[-2.5, -0.8, 0.9, 2.6, 4.3].map(z => <Block key={z} position={[0, 0.13, z]} scale={[0.08, 0.007, 0.33]} material={mat.mint} />)}
    <Block position={[0, -0.1, 6.21]} scale={[15, 0.06, 0.02]} material={mat.mint} />
  </group>
}

function Courier({ demo }: { demo: Demo }) {
  const group = useRef<Group>(null)
  const delivering = demo.stage === 'pickup' || demo.stage === 'testing'
  useFrame((_, dt) => {
    if (!group.current) return
    const progress = demo.stage === 'walking' ? (demo.getElapsed() - 5) / 8 : demo.elapsed >= 13 ? 1 : 0
    const point = sampleRoute(progress)
    group.current.position.set(...point.position)
    const target = demo.stage === 'pickup' ? -Math.PI / 2 : demo.stage === 'testing' ? Math.PI / 2 : point.angle
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, target, 10, dt)
  })
  if (!['pickup', 'walking', 'testing'].includes(demo.stage)) return null
  return <group ref={group} position={[-2.05, 0.12, 1.45]}>
    <RobotCodex color="#dcb583" mode={delivering ? 'delivering' : 'walking'} accessory="backpack" showCard={false} />
  </group>
}

/** One luminous card, carried and transferred between the same episode's agents. */
function EpisodeCard({ demo }: { demo: Demo }) {
  const card = useRef<Group>(null)
  useFrame((_, dt) => {
    if (!card.current) return
    let x = 0, y = 1.2, z = 0, angle = 0
    if (demo.stage === 'pickup') {
      const t = MathUtils.clamp((demo.getElapsed() - 3) / 1.6, 0, 1)
      const eased = t * t * (3 - 2 * t)
      x = MathUtils.lerp(-3.22, -2.47, eased); y = MathUtils.lerp(1.54, 1.24, eased) + Math.sin(t * Math.PI) * 0.15; z = MathUtils.lerp(1.16, 1.775, eased); angle = -Math.PI / 2
    } else if (demo.stage === 'walking') {
      const p = sampleRoute((demo.getElapsed() - 5) / 8)
      x = p.position[0] + Math.cos(p.angle) * 0.35 + Math.sin(p.angle) * 0.15
      z = p.position[2] - Math.sin(p.angle) * 0.35 + Math.cos(p.angle) * 0.15
      y = 1.05; angle = p.angle
    } else {
      const t = MathUtils.clamp((demo.getElapsed() - 13) / 1.6, 0, 1)
      const eased = t * t * (3 - 2 * t)
      x = MathUtils.lerp(2.47, 4.43, eased); y = MathUtils.lerp(1.24, 0.96, eased) + Math.sin(t * Math.PI) * 0.28; z = MathUtils.lerp(3.825, 3.92, eased); angle = Math.PI / 2 * (1 - t)
    }
    card.current.position.set(x, y, z)
    card.current.rotation.y = MathUtils.damp(card.current.rotation.y, angle, 10, dt)
  })
  if (!['pickup', 'walking', 'testing'].includes(demo.stage)) return null
  return <group ref={card}><Block scale={[0.36, 0.23, 0.035]} material={mat.mint} rounded /><Block position={[0, 0.015, 0.021]} scale={[0.21, 0.025, 0.006]} material={mat.dark} /><Block position={[-0.045, -0.04, 0.021]} scale={[0.12, 0.015, 0.006]} material={mat.dark} /></group>
}

function CameraRig({ zoom, reset, focus, selected }: { zoom: number; reset: number; focus: boolean; selected: StationId | null }) {
  const controls = useRef<OrbitControlsType>(null)
  const { camera, size } = useThree()
  const init = useRef(true)
  useEffect(() => {
    if (controls.current) { controls.current.target.set(0, 1.4, 0); controls.current.update() }
  }, [])
  useEffect(() => {
    camera.position.set(11.5, 15.5, 24)
    if (controls.current) { controls.current.target.set(0, 1.4, 0); controls.current.update() }
    init.current = true
  }, [reset, camera])
  useEffect(() => { init.current = !focus }, [focus])
  useEffect(() => {
    const cam = camera as OrthographicCamera
    if (focus && selected && size.width < 760) cam.setViewOffset(size.width, size.height, 0, size.height * 0.28, size.width, size.height)
    else cam.clearViewOffset()
  }, [focus, selected, camera, size.width, size.height])
  const origin = useMemo(() => new Vector3(0, 1.4, 0), [])
  const target = useMemo(() => new Vector3(), [])
  useFrame((_, dt) => {
    const cam = camera as OrthographicCamera
    const fit = Math.min(size.width / 19.9, size.height / 13.9) * (size.width < 760 ? 1.06 : 0.91)
    const desiredZoom = fit * zoom * (focus && selected ? 1.7 : 1)
    cam.zoom = MathUtils.damp(cam.zoom, desiredZoom, 7, dt)
    cam.updateProjectionMatrix()
    if (controls.current && init.current) { controls.current.target.lerp(origin, Math.min(1, dt * 10)); if (controls.current.target.distanceTo(origin) < 0.01) init.current = false }
    if (controls.current && focus && selected) {
      const p = STATION_POSITIONS[selected]
      controls.current.target.lerp(target.set(p[0] * 0.95, p[1] + 1.0, p[2]), Math.min(1, dt * 4))
    }
  })
  return <OrbitControls ref={controls} makeDefault enableRotate enableZoom={false} enablePan={!focus} minPolarAngle={0.7} maxPolarAngle={1.2} minAzimuthAngle={-0.4} maxAzimuthAngle={0.7} minDistance={15} maxDistance={55} />
}

/** DOM labels share React's root; only their projected position changes per frame. */
function LabelProjector({ labels, courierLabel, demo }: { labels: React.RefObject<Map<StationId, HTMLButtonElement>>; courierLabel: React.RefObject<HTMLSpanElement | null>; demo: Demo }) {
  const point = useMemo(() => new Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const station of STATIONS) {
      const label = labels.current.get(station.id)
      if (!label) continue
      const p = STATION_POSITIONS[station.id]
      point.set(p[0] + (p[0] < 0 ? 1.5 : -1.5), p[1] + 0.78, p[2] + 0.45).project(camera)
      label.style.transform = `translate3d(${(point.x * 0.5 + 0.5) * size.width}px,${(-point.y * 0.5 + 0.5) * size.height}px,0) translate(-50%,0)`
      label.style.visibility = point.z > 1 || point.x < -1.2 || point.x > 1.2 ? 'hidden' : 'visible'
    }
    if (courierLabel.current) {
      const progress = demo.stage === 'walking' ? (demo.getElapsed() - 5) / 8 : demo.elapsed >= 13 ? 1 : 0
      const p = sampleRoute(progress).position
      point.set(p[0], p[1] + 1.95, p[2]).project(camera)
      courierLabel.current.style.transform = `translate3d(${(point.x * 0.5 + 0.5) * size.width}px,${(-point.y * 0.5 + 0.5) * size.height}px,0) translate(-50%,-100%)`
    }
  })
  return null
}

export default function OfficeScene({ demo, selected, onSelect, zoom, reset, focus }: { demo: Demo; selected: StationId | null; onSelect: (id: StationId) => void; zoom: number; reset: number; focus: boolean }) {
  const labels = useRef<Map<StationId, HTMLButtonElement>>(new Map())
  const courierLabel = useRef<HTMLSpanElement>(null)
  return <>
    <div className="labels-layer" aria-label="Rótulos de los escritorios">
      {STATIONS.map(station => <button key={station.id} ref={element => { if (element) labels.current.set(station.id, element); else labels.current.delete(station.id) }} className={`station-label ${selected === station.id ? 'is-selected' : ''}`} style={{ '--accent': station.accent } as React.CSSProperties} onClick={() => onSelect(station.id)} aria-label={`Abrir ${station.name}`}>
        <span className={`status-dot ${demo.getStatus(station.id).kind === 'working' ? 'is-working' : ''}`} />{station.name}{selected === station.id && <span>↗</span>}
      </button>)}
      {['pickup', 'walking', 'testing'].includes(demo.stage) && <span ref={courierLabel} className="courier-label">{demo.stage === 'testing' ? 'Entrega completada ✓' : 'Mensajero · Episodio 001'}</span>}
    </div>
    <Canvas orthographic camera={{ position: [11.5, 15.5, 24], zoom: 42, near: 0.1, far: 100 }} dpr={[1, 1.4]} shadows={{ type: 1 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} onPointerMissed={() => { document.body.style.cursor = 'auto' }} fallback={<div className="canvas-fallback">Tu navegador necesita WebGL para mostrar la oficina. Puedes explorar los ocho agentes desde los botones de abajo.</div>}>
    <ambientLight intensity={1.05} color="#c5d9d5" />
    <hemisphereLight args={['#ccdcf1', '#5f4b36', 1.25]} />
    <directionalLight position={[-4, 12, 10]} intensity={2.4} color="#ffebcc" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.001} shadow-normalBias={0.03} />
    <directionalLight position={[8, 8, -7]} intensity={1.3} color="#88b6dd" />
    <Room />
    {STATIONS.map(station => <Station key={station.id} id={station.id} demo={demo} onSelect={onSelect} />)}
    <Courier demo={demo} />
    <EpisodeCard demo={demo} />
    <LabelProjector labels={labels} courierLabel={courierLabel} demo={demo} />
    <CameraRig zoom={zoom} reset={reset} focus={focus} selected={selected} />
  </Canvas></>
}
