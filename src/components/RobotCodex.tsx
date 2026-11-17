/**
 * Construye el robot con piezas 3D reutilizables y aplica sus poses a cada articulación.
 * Los cálculos de animación están en robotMotion.ts; aquí se convierten en movimiento visible.
 */
import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Group, Mesh, MeshStandardMaterial, SphereGeometry, CylinderGeometry, TorusGeometry, MathUtils } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createRobotPose, sampleRobotPose, ROBOT_GESTURE_DURATION, type RobotMode, type RobotPersonality, type RobotGesture } from './robotMotion'

export type { RobotMode } from './robotMotion'
export type RobotAccessory = 'headset' | 'glasses' | 'backpack' | 'none'

/** Parámetros que React usa para cambiar el aspecto, la actividad y las reacciones del robot. */
export interface RobotCodexProps {
  // Aspecto y colocación. Las posiciones son [X, Y, Z] y las rotaciones usan radianes.
  color?: string
  mode?: RobotMode
  accessory?: RobotAccessory
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  // La oficina anima su propia tarjeta; puede ocultar la que viene unida a la mano.
  showCard?: boolean
  // La selección inicia un saludo; interactionKey permite repetirlo al tocar el mismo puesto.
  selected?: boolean
  interactionKey?: number
  // Solo el cambio de false a true dispara una celebración, no cada render de React.
  completed?: boolean
  // El oficio elige los gestos de reposo; reducedMotion limita el movimiento decorativo.
  personality?: RobotPersonality
  reducedMotion?: boolean
  onClick?: () => void
}

// Las geometrías se crean una vez fuera del componente y se comparten entre todos los robots.
// «unit» sirve como pieza genérica: su escala la convierte en manos, botas o pequeños detalles.
const geometry = {
  head: new RoundedBoxGeometry(0.9, 0.68, 0.68, 4, 0.18),
  visor: new RoundedBoxGeometry(0.78, 0.43, 0.12, 4, 0.11),
  torso: new RoundedBoxGeometry(0.49, 0.46, 0.38, 3, 0.09),
  unit: new RoundedBoxGeometry(1, 1, 1, 3, 0.15),
  eye: new RoundedBoxGeometry(0.065, 0.145, 0.025, 3, 0.028),
  sphere: new SphereGeometry(1, 12, 10),
  joint: new CylinderGeometry(1, 1, 1, 12),
  headset: new TorusGeometry(0.485, 0.035, 6, 24, Math.PI),
  lens: new TorusGeometry(0.135, 0.016, 5, 16),
}

// La carcasa, el visor y los detalles comparten materiales para reducir recursos de GPU.
// Los ojos y la tarjeta son emisivos: mantienen un color luminoso sin añadir luces a la escena.
const material = {
  ivory: new MeshStandardMaterial({ color: '#f2eddd', roughness: 0.32, metalness: 0.08 }),
  visor: new MeshStandardMaterial({ color: '#07171e', roughness: 0.16, metalness: 0.55 }),
  joint: new MeshStandardMaterial({ color: '#283a44', roughness: 0.7 }),
  sole: new MeshStandardMaterial({ color: '#25343c', roughness: 0.85 }),
  eyes: new MeshStandardMaterial({ color: '#66ffe0', emissive: '#35e9c6', emissiveIntensity: 2.4, roughness: 0.2, toneMapped: false }),
  gleam: new MeshStandardMaterial({ color: '#a8d5db', emissive: '#54858e', emissiveIntensity: 0.12, transparent: true, opacity: 0.22 }),
  copper: new MeshStandardMaterial({ color: '#d0b885', roughness: 0.4, metalness: 0.5 }),
  card: new MeshStandardMaterial({ color: '#b7ffea', emissive: '#58e9c2', emissiveIntensity: 1.2, roughness: 0.3, toneMapped: false }),
}

// Caché por color: dos robots con el mismo acento reutilizan el mismo material.
const accents = new Map<string, MeshStandardMaterial>()
function accentMaterial(color: string) {
  let result = accents.get(color)
  if (!result) {
    result = new MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.15 })
    accents.set(color, result)
  }
  return result
}

/** Robot articulado: mira hacia +Z en sus coordenadas locales y apoya los pies cerca de Y=0. */
export function RobotCodex({ color = '#6c8b91', mode = 'idle', accessory = 'none', position, rotation, scale = 1, showCard = true, selected = false, interactionKey = 0, completed = false, personality = 'curious', reducedMotion = false, onClick }: RobotCodexProps) {
  // Las refs apuntan a objetos de Three.js. Cambiarlos anima el modelo sin actualizar
  // estado de React en cada fotograma; React sigue controlando las props de la tarea.
  const root = useRef<Group>(null)
  const head = useRef<Group>(null)
  const body = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)
  const card = useRef<Mesh>(null)
  // Un desfase estable evita que todos parpadeen y hagan sus hábitos al mismo tiempo.
  // Se reutiliza el objeto pose en vez de crear una pose nueva en cada fotograma.
  const phase = useRef(Math.random() * 3)
  const pose = useRef(createRobotPose())
  // Guarda las señales del fotograma anterior para detectar selecciones y tareas recién terminadas.
  const motion = useRef({
    selected: false, interactionKey: 0, completed: false,
    gesture: null as RobotGesture, startedAt: 0,
  })
  const accent = useMemo(() => accentMaterial(color), [color])

  // R3F llama a esta función antes de dibujar cada fotograma. «delta» son los segundos transcurridos.
  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime
    const state = motion.current
    // Caminar y entregar tienen prioridad; un saludo no debe interrumpir el transporte.
    const locked = mode === 'walking' || mode === 'delivering'
    const greet = selected && (!state.selected || interactionKey !== state.interactionKey)
    const celebrate = completed && !state.completed
    state.selected = selected
    state.interactionKey = interactionKey
    state.completed = completed
    // Consume también las señales recibidas durante una entrega para no reproducir gestos atrasados.
    if (locked) state.gesture = null
    else if (celebrate || greet) {
      state.gesture = celebrate ? 'celebrate' : 'wave'
      state.startedAt = now
    }
    // Los gestos tienen duración finita. Al acabar, la pose vuelve al trabajo o al reposo.
    if (state.gesture && now - state.startedAt >= ROBOT_GESTURE_DURATION[state.gesture]) state.gesture = null
    const target = sampleRobotPose({
      time: now, phase: phase.current, mode, personality,
      gesture: state.gesture, gestureTime: now - state.startedAt, reducedMotion,
    }, pose.current)
    // Acerca las articulaciones a la pose objetivo según el tiempo transcurrido, no un paso fijo.
    // El límite de delta evita un salto brusco si el navegador estuvo detenido.
    const blend = 1 - Math.exp(-Math.min(delta, 0.1) * 12)
    function rotate(group: Group | null, x: number, y: number, z: number) {
      if (!group) return
      group.rotation.x = MathUtils.lerp(group.rotation.x, x, blend)
      group.rotation.y = MathUtils.lerp(group.rotation.y, y, blend)
      group.rotation.z = MathUtils.lerp(group.rotation.z, z, blend)
    }
    // Cada grupo gira desde su origen local: cuello y hombros. El cuerpo añade un balanceo suave.
    rotate(head.current, target.headX, target.headY, target.headZ)
    rotate(body.current, target.bodyX, 0, target.bodyZ)
    rotate(leftArm.current, target.leftArmX, target.leftArmY, target.leftArmZ)
    rotate(rightArm.current, target.rightArmX, target.rightArmY, target.rightArmZ)
    if (body.current) body.current.position.y = MathUtils.lerp(body.current.position.y, target.bodyY, blend)
    // La escala vertical produce el parpadeo; anchura y desplazamiento expresan la mirada.
    if (eyes.current) {
      eyes.current.scale.y = target.eyeHeight
      eyes.current.scale.x = MathUtils.lerp(eyes.current.scale.x, target.eyeWidth, blend)
      eyes.current.position.x = MathUtils.lerp(eyes.current.position.x, target.eyeShift, blend)
    }
    function moveLeg(leg: Group | null, angle: number, lift: number) {
      if (!leg) return
      leg.rotation.x = MathUtils.lerp(leg.rotation.x, angle, blend)
      const a = leg.rotation.x
      // Compensa la inclinación de la suela al caminar. «lift» levanta solo el pie que avanza;
      // las constantes corresponden a las dimensiones y posiciones de las botas modeladas abajo.
      leg.position.y = 0.0075 + 0.4225 * Math.cos(a) + 0.055 * Math.sin(a)
        + 0.1625 * Math.abs(Math.sin(a)) + lift
    }
    moveLeg(leftLeg.current, target.leftLegX, target.leftFootLift)
    moveLeg(rightLeg.current, target.rightLegX, target.rightFootLift)
    if (card.current) card.current.visible = mode === 'delivering' && showCard
    // Metadatos para inspeccionar la actividad actual del modelo, sin convertirla en estado de React.
    if (root.current) {
      root.current.userData.mode = mode
      root.current.userData.gesture = target.gesture
      root.current.userData.reducedMotion = reducedMotion
    }
  })

  // Detiene la propagación para que pulsar una pieza del robot abra una sola ficha de agente.
  function click(event: ThreeEvent<MouseEvent>) {
    if (onClick) {
      event.stopPropagation()
      onClick()
    }
  }

  // El grupo raíz permite mover o escalar el robot entero. dispose={null} conserva las
  // geometrías y materiales compartidos cuando desaparece una instancia, como el mensajero.
  return (
    <group ref={root} name={`robot-${personality}`} position={position} rotation={rotation} scale={scale} onClick={click} dispose={null}>
      {/* Torso, placa frontal, indicador del pecho y cuello forman la parte superior del cuerpo. */}
      <group ref={body} name="upper-body">
        <mesh geometry={geometry.torso} material={accent} position={[0, 0.76, 0]} castShadow />
        <mesh geometry={geometry.unit} material={material.ivory} position={[0, 0.78, 0.198]} scale={[0.27, 0.25, 0.045]} />
        <mesh geometry={geometry.unit} material={material.joint} position={[0, 0.8, 0.225]} scale={[0.12, 0.032, 0.014]} />
        <mesh geometry={geometry.sphere} material={material.eyes} position={[0, 0.72, 0.229]} scale={0.022} />
        <mesh geometry={geometry.joint} material={material.joint} position={[0, 1.02, 0]} scale={[0.09, 0.11, 0.09]} />

        {/* La cabeza gira desde el cuello y arrastra el visor, los ojos y los accesorios que contiene. */}
        <group ref={head} name="head" position={[0, 1.06, 0]}>
          <mesh geometry={geometry.head} material={material.ivory} position={[0, 0.29, 0]} castShadow />
          <mesh geometry={geometry.visor} material={material.visor} position={[0, 0.29, 0.317]} />
          <mesh geometry={geometry.unit} material={material.gleam} position={[-0.21, 0.421, 0.38]} rotation={[0, 0, -0.15]} scale={[0.16, 0.025, 0.008]} />
          {/* Ambos ojos comparten un grupo para parpadear y desplazar la mirada juntos. */}
          <group ref={eyes} position={[0, 0.302, 0.386]}>
            <mesh geometry={geometry.eye} material={material.eyes} position={[-0.17, 0, 0]} rotation={[0, 0, -0.06]} />
            <mesh geometry={geometry.eye} material={material.eyes} position={[0.17, 0, 0]} rotation={[0, 0, 0.06]} />
          </group>
          <mesh geometry={geometry.unit} material={material.ivory} position={[0, 0.205, 0.388]} scale={[0.055, 0.012, 0.008]} />
          <mesh geometry={geometry.unit} material={accent} position={[0, 0.642, -0.03]} scale={[0.19, 0.025, 0.13]} />
          {/* Voz: diadema, dos auriculares y brazo del micrófono unidos a la cabeza. */}
          {accessory === 'headset' && (
            <group position={[0, 0.29, 0]}>
              <mesh geometry={geometry.headset} material={material.joint} position={[0, 0.005, -0.04]} />
              {[-1, 1].map(side => <group key={side} position={[side * 0.458, 0, 0]}>
                <mesh geometry={geometry.unit} material={material.joint} scale={[0.12, 0.255, 0.27]} />
                <mesh geometry={geometry.unit} material={accent} position={[side * 0.06, 0, 0]} scale={[0.045, 0.185, 0.185]} />
              </group>)}
              <mesh geometry={geometry.unit} material={material.joint} position={[-0.43, -0.15, 0.21]} rotation={[-0.3, -0.25, 0]} scale={[0.035, 0.035, 0.34]} />
              <mesh geometry={geometry.sphere} material={material.joint} position={[-0.375, -0.2, 0.38]} scale={[0.065, 0.045, 0.045]} />
            </group>
          )}
          {/* Pruebas: dos aros, puente y patillas; las gafas siguen la orientación del visor. */}
          {accessory === 'glasses' && <group position={[0, 0.302, 0.412]}>
            <mesh geometry={geometry.lens} material={material.copper} position={[-0.17, 0, 0]} />
            <mesh geometry={geometry.lens} material={material.copper} position={[0.17, 0, 0]} />
            <mesh geometry={geometry.unit} material={material.copper} position={[0, 0.02, 0]} scale={[0.095, 0.025, 0.025]} />
            {[-1, 1].map(side => <mesh key={side} geometry={geometry.unit} material={material.copper} position={[side * 0.355, 0.02, -0.06]} rotation={[0, side * -0.4, 0]} scale={[0.11, 0.025, 0.17]} />)}
          </group>}
        </group>

        {/* Cada brazo se genera a un lado del torso y gira desde el hombro con su mitón completo. */}
        {([-1, 1] as const).map(side => <group key={side} ref={side < 0 ? leftArm : rightArm} name={side < 0 ? 'left-arm' : 'right-arm'} position={[side * 0.325, 0.94, 0]}>
          <mesh geometry={geometry.sphere} material={material.joint} scale={0.085} />
          <mesh geometry={geometry.unit} material={material.ivory} position={[0, -0.13, 0]} scale={[0.14, 0.25, 0.15]} castShadow />
          <mesh geometry={geometry.joint} material={accent} position={[0, -0.255, 0]} scale={[0.079, 0.05, 0.079]} />
          <mesh geometry={geometry.unit} material={material.ivory} position={[0, -0.345, 0.025]} scale={[0.19, 0.18, 0.2]} castShadow />
          <mesh geometry={geometry.sphere} material={material.ivory} position={[-side * 0.09, -0.32, 0.075]} scale={[0.052, 0.065, 0.052]} />
          {/* La tarjeta opcional pertenece a la mano derecha; useFrame controla cuándo se muestra. */}
          {side === 1 && <mesh ref={card} geometry={geometry.unit} material={material.card} position={[0, -0.44, 0.075]} scale={[0.31, 0.2, 0.025]} visible={false} />}
        </group>)}

        {/* Mensajero: mochila situada detrás del torso, que acompaña el balanceo del cuerpo. */}
        {accessory === 'backpack' && <group position={[0, 0.8, -0.245]}>
          <mesh geometry={geometry.unit} material={accent} scale={[0.39, 0.46, 0.2]} castShadow />
          <mesh geometry={geometry.unit} material={material.joint} position={[0, -0.065, -0.1]} scale={[0.29, 0.18, 0.065]} />
          <mesh geometry={geometry.unit} material={material.eyes} position={[0, 0.085, -0.105]} scale={[0.16, 0.035, 0.01]} />
          {[-1, 1].map(side => <mesh key={side} geometry={geometry.unit} material={material.copper} position={[side * 0.135, 0, 0.15]} scale={[0.055, 0.37, 0.06]} />)}
        </group>}
      </group>

      {/* Las piernas nacen en las caderas, fuera del grupo del torso: un saludo no mueve los pies. */}
      {([-1, 1] as const).map(side => <group key={side} ref={side < 0 ? leftLeg : rightLeg} name={side < 0 ? 'left-leg' : 'right-leg'} position={[side * 0.145, 0.43, 0]}>
        <mesh geometry={geometry.sphere} material={material.joint} scale={0.08} />
        <mesh geometry={geometry.unit} material={material.ivory} position={[0, -0.145, 0]} scale={[0.16, 0.24, 0.18]} castShadow />
        <mesh geometry={geometry.unit} material={accent} position={[0, -0.315, 0.055]} scale={[0.225, 0.19, 0.32]} castShadow />
        <mesh geometry={geometry.unit} material={material.sole} position={[0, -0.405, 0.055]} scale={[0.23, 0.035, 0.325]} />
      </group>)}
    </group>
  )
}

export default RobotCodex
