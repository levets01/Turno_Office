/**
 * Biblioteca de poses sin dependencias de React ni de Three.js.
 * Recibe tiempo y actividad; devuelve ángulos y desplazamientos que RobotCodex aplica a sus grupos.
 */
export type RobotMode = 'idle' | 'working' | 'walking' | 'delivering'
export type RobotPersonality = 'curious' | 'writer' | 'tester' | 'voice' | 'editor' | 'designer' | 'publisher' | 'analyst' | 'courier'
export type RobotGesture = 'wave' | 'celebrate' | null

// Duración en segundos de las reacciones puntuales, independientes de los hábitos de reposo.
export const ROBOT_GESTURE_DURATION = { wave: 2.2, celebrate: 2.6 } as const

/** Los ángulos están en radianes; las traslaciones usan las mismas unidades que el modelo 3D. */
export interface RobotPose {
  // Orientación de cabeza y cuerpo, seguida de los ángulos de hombros y caderas.
  headX: number; headY: number; headZ: number
  bodyY: number; bodyX: number; bodyZ: number
  leftArmX: number; leftArmY: number; leftArmZ: number
  rightArmX: number; rightArmY: number; rightArmZ: number
  leftLegX: number; rightLegX: number
  // Elevación del pie que avanza. A cero, la suela se mantiene apoyada mediante la compensación del modelo.
  leftFootLift: number; rightFootLift: number
  // Escalas de los ojos (1 = tamaño normal) y desplazamiento horizontal de la mirada.
  eyeHeight: number; eyeWidth: number; eyeShift: number
  // Intensidad del gesto y nombre de la pose actual, útil para inspección y pruebas.
  expression: number
  gesture: string
}

/** «time» es el reloj general; «phase» lo desfasa y «gestureTime» mide solo la reacción actual. */
export interface RobotMotionInput {
  time: number
  phase: number
  mode: RobotMode
  personality: RobotPersonality
  gesture?: RobotGesture
  gestureTime?: number
  reducedMotion?: boolean
}

// Pose inicial que cada robot guarda y reutiliza. No crea geometría ni modifica la escena.
export function createRobotPose(): RobotPose {
  return {
    headX: 0, headY: 0, headZ: 0, bodyY: 0, bodyX: 0, bodyZ: 0,
    leftArmX: 0, leftArmY: 0, leftArmZ: 0, rightArmX: 0, rightArmY: 0, rightArmZ: 0,
    leftLegX: 0, rightLegX: 0, leftFootLift: 0, rightFootLift: 0,
    eyeHeight: 1, eyeWidth: 1, eyeShift: 0, expression: 0, gesture: 'idle',
  }
}

// Desfases por oficio: distribuyen los hábitos en el tiempo para que el equipo no se mueva al unísono.
const offsets: Record<RobotPersonality, number> = {
  curious: 0.3, writer: 2.5, tester: 5, voice: 7.5, editor: 10, designer: 12.5,
  publisher: 15, analyst: 17.5, courier: 20,
}
// clamp limita un peso a 0–1; smooth suaviza su entrada/salida; mix combina dos valores con ese peso.
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
// La envolvente activa un gesto gradualmente y lo apaga al final de su duración.
// Fuera del intervalo, su peso vale cero; así las poses se enlazan con el reposo.
const envelope = (time: number, duration: number) => smooth(time / 0.38) * smooth((duration - time) / 0.42)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** Calcula una pose para un instante concreto y escribe sobre el objeto recibido, sin crear otro. */
export function sampleRobotPose(input: RobotMotionInput, pose: RobotPose): RobotPose {
  const { mode, personality, reducedMotion = false } = input
  const t = input.time + input.phase + offsets[personality]
  // Reinicia todos los campos antes de aplicar la actividad: una pose anterior no deja brazos
  // levantados ni expresiones residuales. La base incluye respiración y una leve inclinación.
  pose.headX = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.035
  pose.headY = 0
  pose.headZ = reducedMotion ? 0 : Math.sin(t * 0.7) * 0.045
  pose.bodyY = reducedMotion ? 0 : Math.sin(t * 1.8) * 0.009
  pose.bodyX = 0
  pose.bodyZ = 0
  pose.leftArmX = pose.rightArmX = -0.08
  pose.leftArmY = pose.rightArmY = 0
  pose.leftArmZ = -0.12
  pose.rightArmZ = 0.12
  pose.leftLegX = pose.rightLegX = 0
  pose.leftFootLift = pose.rightFootLift = 0
  pose.eyeHeight = pose.eyeWidth = 1
  pose.eyeShift = 0
  pose.expression = 0
  pose.gesture = mode

  // La actividad funcional tiene prioridad: caminar y entregar no reciben saludos ni celebraciones.
  if (mode === 'walking') {
    // Brazos y piernas alternan en sentidos opuestos. Solo el pie que avanza se eleva.
    const stride = Math.sin(t * 8)
    const amplitude = reducedMotion ? 0.45 : 1
    pose.leftArmX = -stride * 0.52 * amplitude
    pose.rightArmX = stride * 0.52 * amplitude
    pose.leftLegX = stride * 0.42 * amplitude
    pose.rightLegX = -stride * 0.42 * amplitude
    pose.leftFootLift = Math.max(0, -stride) * 0.05 * amplitude
    pose.rightFootLift = Math.max(0, stride) * 0.05 * amplitude
    pose.bodyY = Math.abs(Math.cos(t * 8)) * 0.025 * amplitude
    pose.bodyZ = Math.sin(t * 8) * 0.025 * amplitude
    pose.headX = -0.035
    pose.headZ = 0
  } else if (mode === 'delivering') {
    // Mantiene la mano derecha extendida mientras la escena mueve la tarjeta del episodio.
    pose.rightArmX = -1.85
    pose.rightArmZ = 0.05
    pose.leftArmX = -0.25
    pose.headX = 0.04
    pose.headZ = 0
    pose.bodyY = 0
    pose.eyeWidth = 1.12
  } else {
    if (mode === 'working') {
      // Tecleo alternado con una pausa breve cada 7.6 s para levantar la vista al monitor.
      const pause = reducedMotion ? 0 : envelope(t % 7.6 - 5.3, 1.4)
      pose.headX = mix(0.21, -0.025, pause)
      pose.headY = -0.32 + (reducedMotion ? 0 : Math.sin(t * 0.9) * 0.06)
      pose.headZ = reducedMotion ? 0 : Math.sin(t * 1.4) * 0.025
      pose.leftArmX = -1.06 + (reducedMotion ? 0 : Math.sin(t * 7) * 0.18 * (1 - pause))
      pose.rightArmX = -1.06 + (reducedMotion ? 0 : Math.sin(t * 7 + Math.PI) * 0.18 * (1 - pause))
      pose.leftArmZ = -0.16
      pose.rightArmZ = 0.16
      pose.eyeHeight = mix(0.85, 1.2, pause)
      pose.eyeShift = -0.022
      if (pause > 0.2) pose.gesture = 'review'
    } else if (!reducedMotion) {
      // Ciclo de 24 s: hábito propio durante unos 4 s, descanso y un estiramiento desde el segundo 13.
      // El desfase del oficio y el del individuo hacen que estos intervalos empiecen en momentos distintos.
      const cycle = t % 24
      const habit = envelope(cycle, 4.1)
      const stretch = envelope(cycle - 13, 3.8)
      pose.headY = Math.sin(t * 0.43) * 0.17
      pose.eyeShift = Math.sin(t * 0.43) * 0.02
      if (habit > 0) {
        if (personality === 'voice') {
          // Acerca una mano al audífono y mueve cabeza y otra mano siguiendo un ritmo.
          pose.gesture = 'listen'
          pose.headX += Math.sin(t * 4.4) * 0.075 * habit
          pose.headZ = mix(pose.headZ, -0.1, habit)
          pose.leftArmX = mix(-0.08, 0.6, habit)
          pose.leftArmZ = mix(-0.12, -2.2, habit)
          pose.rightArmX -= (0.2 + Math.sin(t * 4.4) * 0.12) * habit
          pose.eyeHeight = mix(1, 0.7, habit)
        } else if (personality === 'tester') {
          // Lleva la mano hacia el lateral de las gafas y orienta la mirada para examinarlas.
          pose.gesture = 'adjust-glasses'
          pose.headY = mix(pose.headY, 0.16, habit)
          pose.headX = mix(pose.headX, 0.12, habit)
          pose.rightArmX = mix(-0.08, 0.66, habit)
          pose.rightArmZ = mix(0.12, 2.3, habit)
          pose.eyeWidth = mix(1, 1.17, habit)
        } else if (personality === 'writer' || personality === 'analyst') {
          // Guion y Retención comparten una pose pensativa, mirando hacia lados distintos.
          pose.gesture = 'think'
          pose.headX = mix(pose.headX, -0.13, habit)
          pose.headY = mix(pose.headY, personality === 'writer' ? 0.32 : -0.27, habit)
          pose.headZ = mix(pose.headZ, 0.16, habit)
          pose.rightArmX = mix(-0.08, -1.65, habit)
          pose.rightArmZ = mix(0.12, 0.4, habit)
          pose.eyeWidth = mix(1, 1.25, habit)
          pose.eyeHeight = mix(1, 0.78, habit)
        } else if (personality === 'designer') {
          // Portada inclina la cabeza y adelanta una mano, como si revisara su composición.
          pose.gesture = 'inspect'
          pose.headZ = mix(pose.headZ, Math.sin(t * 1.7) * 0.17, habit)
          pose.headY = mix(pose.headY, -0.18, habit)
          pose.leftArmX = mix(-0.08, -1.4, habit)
          pose.leftArmZ = mix(-0.12, -0.36, habit)
          pose.eyeWidth = mix(1, 1.18, habit)
        } else if (personality === 'editor') {
          // Edición acompaña un ritmo con la cabeza, el torso y una mano.
          pose.gesture = 'rhythm'
          pose.headX += Math.sin(t * 4) * 0.085 * habit
          pose.bodyZ = Math.sin(t * 2) * 0.025 * habit
          pose.rightArmX = mix(-0.08, -0.9 + Math.sin(t * 4) * 0.18, habit)
        } else {
          // El resto observa el entorno con un giro de cabeza y los ojos algo más abiertos.
          pose.gesture = 'look-around'
          pose.headY = mix(pose.headY, Math.sin(cycle * 1.6) * 0.43, habit)
          pose.headZ = mix(pose.headZ, -0.1, habit)
          pose.eyeWidth = mix(1, 1.13, habit)
          pose.leftArmX = mix(-0.08, -0.45, habit)
        }
      }
      if (stretch > 0) {
        // Eleva ambos brazos hacia fuera, estira el torso y entrecierra los ojos; los pies no cambian.
        pose.gesture = 'stretch'
        pose.leftArmZ = mix(-0.12, -2.2, stretch)
        pose.rightArmZ = mix(0.12, 2.2, stretch)
        pose.leftArmX = pose.rightArmX = -0.12
        pose.headX = mix(pose.headX, -0.12, stretch)
        pose.headZ = Math.sin(t * 1.8) * 0.065 * stretch
        pose.bodyY += 0.025 * stretch
        pose.eyeHeight = mix(1, 0.5, stretch)
        pose.eyeWidth = mix(1, 1.3, stretch)
      }
    }

    // Un saludo o una celebración se superponen a trabajo/reposo durante un intervalo finito.
    // Al terminar, este bloque deja de intervenir y vuelve a verse la actividad de base.
    const gestureTime = input.gestureTime ?? -1
    const gesture = input.gesture
    if (gesture && gestureTime >= 0 && gestureTime < ROBOT_GESTURE_DURATION[gesture]) {
      const strength = envelope(gestureTime, ROBOT_GESTURE_DURATION[gesture])
      pose.gesture = gesture
      // Orienta el rostro hacia el visitante y ensancha los ojos durante la reacción.
      pose.headY = mix(pose.headY, 0.3, strength)
      pose.headX = mix(pose.headX, -0.08, strength)
      pose.headZ = mix(pose.headZ, -0.06, strength)
      pose.eyeShift = mix(pose.eyeShift, 0.025, strength)
      pose.expression = strength
      pose.eyeHeight = mix(pose.eyeHeight, 0.62, strength)
      pose.eyeWidth = mix(pose.eyeWidth, 1.35, strength)
      if (reducedMotion) {
        // Con movimiento reducido, responde con una pose tranquila sin el vaivén repetido del saludo.
        pose.rightArmX = mix(pose.rightArmX, -0.8, strength)
        pose.rightArmZ = mix(pose.rightArmZ, 0.48, strength)
      } else if (gesture === 'wave') {
        // Saludo: brazo derecho levantado con una oscilación corta y una ligera inclinación del torso.
        pose.rightArmX = mix(pose.rightArmX, -0.12, strength)
        pose.rightArmZ = mix(pose.rightArmZ, 2.45 + Math.sin(gestureTime * 11) * 0.23, strength)
        pose.leftArmX = mix(pose.leftArmX, -0.2, strength)
        pose.bodyZ = -0.025 * strength
      } else {
        // Celebración: ambos brazos arriba y balanceo de torso/cabeza, manteniendo las piernas quietas.
        pose.leftArmX = mix(pose.leftArmX, -0.1, strength)
        pose.rightArmX = mix(pose.rightArmX, -0.1, strength)
        pose.leftArmZ = mix(pose.leftArmZ, -2.35 - Math.sin(gestureTime * 9) * 0.12, strength)
        pose.rightArmZ = mix(pose.rightArmZ, 2.35 + Math.sin(gestureTime * 9) * 0.12, strength)
        pose.bodyZ = Math.sin(gestureTime * 6) * 0.045 * strength
        pose.headZ = -Math.sin(gestureTime * 6) * 0.06 * strength
        pose.bodyY += 0.018 * strength
      }
    }
  }

  // El parpadeo se aplica al final para funcionar también durante cualquier gesto.
  // En movimiento reducido se conserva, pero con un intervalo más largo.
  const blinkTime = t % (reducedMotion ? 6.2 : 4.7)
  const blink = blinkTime < 0.17 ? Math.abs(Math.cos(blinkTime / 0.17 * Math.PI)) : 1
  pose.eyeHeight *= Math.max(0.07, blink)
  return pose
}
