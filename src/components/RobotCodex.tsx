import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Group, Mesh, MeshStandardMaterial, SphereGeometry, CylinderGeometry, TorusGeometry, MathUtils } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export type RobotMode = 'idle' | 'working' | 'walking' | 'delivering'
export type RobotAccessory = 'headset' | 'glasses' | 'backpack' | 'none'

export interface RobotCodexProps {
  color?: string
  mode?: RobotMode
  accessory?: RobotAccessory
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  showCard?: boolean
  onClick?: () => void
}

// Shared between every robot. Editing these shapes changes the whole team.
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

const accents = new Map<string, MeshStandardMaterial>()
function accentMaterial(color: string) {
  let result = accents.get(color)
  if (!result) {
    result = new MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.15 })
    accents.set(color, result)
  }
  return result
}

/** Articulated, code-modelled Codex bot. Its local front is +Z and its feet touch Y=0. */
export function RobotCodex({ color = '#6c8b91', mode = 'idle', accessory = 'none', position, rotation, scale = 1, showCard = true, onClick }: RobotCodexProps) {
  const head = useRef<Group>(null)
  const body = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)
  const card = useRef<Mesh>(null)
  const phase = useRef(Math.random() * 30)
  const accent = useMemo(() => accentMaterial(color), [color])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime + phase.current
    const movement = Math.min(delta * 10, 1)
    const walk = mode === 'walking'
    const work = mode === 'working'
    const deliver = mode === 'delivering'
    const stride = Math.sin(t * 8)
    const idleGlance = Math.max(0, Math.sin(t * 0.42)) ** 14
    if (head.current) {
      head.current.rotation.y = MathUtils.lerp(head.current.rotation.y, walk ? 0 : work ? -0.32 + Math.sin(t * 0.9) * 0.045 : idleGlance * 0.32, movement)
      head.current.rotation.x = MathUtils.lerp(head.current.rotation.x, work ? 0.21 : deliver ? 0.04 : Math.sin(t * 1.1) * 0.025, movement)
      head.current.rotation.z = work ? Math.sin(t * 1.4) * 0.018 : Math.sin(t * 0.8) * 0.035
    }
    // A quick blink every few seconds; the emissive eyes retain their legibility.
    if (eyes.current) {
      const blinkCycle = t % 4.7
      const blink = blinkCycle < 0.17 ? Math.abs(Math.cos((blinkCycle / 0.17) * Math.PI)) : 1
      eyes.current.scale.y = Math.max(0.07, blink)
    }
    if (body.current) body.current.position.y = walk ? Math.abs(Math.cos(t * 8)) * 0.025 : Math.sin(t * 2) * 0.008
    const armX = (side: number) => walk ? -stride * side * 0.52 : work ? -1.06 + Math.sin(t * 7 + (side > 0 ? Math.PI : 0)) * 0.14 : deliver && side < 0 ? -1.85 : -0.07 + Math.sin(t * 1.5) * 0.035
    if (leftArm.current) {
      leftArm.current.rotation.x = MathUtils.lerp(leftArm.current.rotation.x, armX(1), movement)
      leftArm.current.rotation.z = work ? -0.16 : -0.1
    }
    if (rightArm.current) {
      rightArm.current.rotation.x = MathUtils.lerp(rightArm.current.rotation.x, armX(-1), movement)
      rightArm.current.rotation.z = deliver ? 0.05 : work ? 0.16 : 0.1
    }
    if (leftLeg.current) {
      leftLeg.current.rotation.x = MathUtils.lerp(leftLeg.current.rotation.x, walk ? stride * 0.42 : 0, movement)
      const angle = leftLeg.current.rotation.x
      // Compensate for the boot's rotated sole: the supporting foot stays on
      // the floor while the opposite foot lifts, instead of clipping through it.
      leftLeg.current.position.y = 0.0075 + 0.4225 * Math.cos(angle) + 0.055 * Math.sin(angle) + 0.1625 * Math.abs(Math.sin(angle)) + (walk ? Math.max(0, -stride) * 0.05 : 0)
    }
    if (rightLeg.current) {
      rightLeg.current.rotation.x = MathUtils.lerp(rightLeg.current.rotation.x, walk ? -stride * 0.42 : 0, movement)
      const angle = rightLeg.current.rotation.x
      rightLeg.current.position.y = 0.0075 + 0.4225 * Math.cos(angle) + 0.055 * Math.sin(angle) + 0.1625 * Math.abs(Math.sin(angle)) + (walk ? Math.max(0, stride) * 0.05 : 0)
    }
    if (card.current) card.current.visible = deliver && showCard
  })

  function click(event: ThreeEvent<MouseEvent>) {
    if (onClick) {
      event.stopPropagation()
      onClick()
    }
  }

  return (
    <group position={position} rotation={rotation} scale={scale} onClick={click} dispose={null}>
      <group ref={body}>
        <mesh geometry={geometry.torso} material={accent} position={[0, 0.76, 0]} castShadow />
        <mesh geometry={geometry.unit} material={material.ivory} position={[0, 0.78, 0.198]} scale={[0.27, 0.25, 0.045]} />
        <mesh geometry={geometry.unit} material={material.joint} position={[0, 0.8, 0.225]} scale={[0.12, 0.032, 0.014]} />
        <mesh geometry={geometry.sphere} material={material.eyes} position={[0, 0.72, 0.229]} scale={0.022} />
        <mesh geometry={geometry.joint} material={material.joint} position={[0, 1.02, 0]} scale={[0.09, 0.11, 0.09]} />

        {/* The neck owns the head, face and accessories. */}
        <group ref={head} position={[0, 1.06, 0]}>
          <mesh geometry={geometry.head} material={material.ivory} position={[0, 0.29, 0]} castShadow />
          <mesh geometry={geometry.visor} material={material.visor} position={[0, 0.29, 0.317]} />
          <mesh geometry={geometry.unit} material={material.gleam} position={[-0.21, 0.421, 0.38]} rotation={[0, 0, -0.15]} scale={[0.16, 0.025, 0.008]} />
          <group ref={eyes} position={[0, 0.302, 0.386]}>
            <mesh geometry={geometry.eye} material={material.eyes} position={[-0.17, 0, 0]} rotation={[0, 0, -0.06]} />
            <mesh geometry={geometry.eye} material={material.eyes} position={[0.17, 0, 0]} rotation={[0, 0, 0.06]} />
          </group>
          <mesh geometry={geometry.unit} material={material.ivory} position={[0, 0.205, 0.388]} scale={[0.055, 0.012, 0.008]} />
          <mesh geometry={geometry.unit} material={accent} position={[0, 0.642, -0.03]} scale={[0.19, 0.025, 0.13]} />
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
          {accessory === 'glasses' && <group position={[0, 0.302, 0.412]}>
            <mesh geometry={geometry.lens} material={material.copper} position={[-0.17, 0, 0]} />
            <mesh geometry={geometry.lens} material={material.copper} position={[0.17, 0, 0]} />
            <mesh geometry={geometry.unit} material={material.copper} position={[0, 0.02, 0]} scale={[0.095, 0.025, 0.025]} />
            {[-1, 1].map(side => <mesh key={side} geometry={geometry.unit} material={material.copper} position={[side * 0.355, 0.02, -0.06]} rotation={[0, side * -0.4, 0]} scale={[0.11, 0.025, 0.17]} />)}
          </group>}
        </group>

        {/* The shoulder is the origin of each whole arm, including its mitten. */}
        {([-1, 1] as const).map(side => <group key={side} ref={side < 0 ? leftArm : rightArm} position={[side * 0.325, 0.94, 0]}>
          <mesh geometry={geometry.sphere} material={material.joint} scale={0.085} />
          <mesh geometry={geometry.unit} material={material.ivory} position={[0, -0.13, 0]} scale={[0.14, 0.25, 0.15]} castShadow />
          <mesh geometry={geometry.joint} material={accent} position={[0, -0.255, 0]} scale={[0.079, 0.05, 0.079]} />
          <mesh geometry={geometry.unit} material={material.ivory} position={[0, -0.345, 0.025]} scale={[0.19, 0.18, 0.2]} castShadow />
          <mesh geometry={geometry.sphere} material={material.ivory} position={[-side * 0.09, -0.32, 0.075]} scale={[0.052, 0.065, 0.052]} />
          {side === 1 && <mesh ref={card} geometry={geometry.unit} material={material.card} position={[0, -0.44, 0.075]} scale={[0.31, 0.2, 0.025]} visible={false} />}
        </group>)}

        {accessory === 'backpack' && <group position={[0, 0.8, -0.245]}>
          <mesh geometry={geometry.unit} material={accent} scale={[0.39, 0.46, 0.2]} castShadow />
          <mesh geometry={geometry.unit} material={material.joint} position={[0, -0.065, -0.1]} scale={[0.29, 0.18, 0.065]} />
          <mesh geometry={geometry.unit} material={material.eyes} position={[0, 0.085, -0.105]} scale={[0.16, 0.035, 0.01]} />
          {[-1, 1].map(side => <mesh key={side} geometry={geometry.unit} material={material.copper} position={[side * 0.135, 0, 0.15]} scale={[0.055, 0.37, 0.06]} />)}
        </group>}
      </group>

      {/* Hip pivots keep leg motion independent of upper-body animation. */}
      {([-1, 1] as const).map(side => <group key={side} ref={side < 0 ? leftLeg : rightLeg} position={[side * 0.145, 0.43, 0]}>
        <mesh geometry={geometry.sphere} material={material.joint} scale={0.08} />
        <mesh geometry={geometry.unit} material={material.ivory} position={[0, -0.145, 0]} scale={[0.16, 0.24, 0.18]} castShadow />
        <mesh geometry={geometry.unit} material={accent} position={[0, -0.315, 0.055]} scale={[0.225, 0.19, 0.32]} castShadow />
        <mesh geometry={geometry.unit} material={material.sole} position={[0, -0.405, 0.055]} scale={[0.23, 0.035, 0.325]} />
      </group>)}
    </group>
  )
}

export default RobotCodex
