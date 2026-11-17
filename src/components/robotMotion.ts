export type RobotMode = 'idle' | 'working' | 'walking' | 'delivering'
export type RobotPersonality = 'curious' | 'writer' | 'tester' | 'voice' | 'editor' | 'designer' | 'publisher' | 'analyst' | 'courier'
export type RobotGesture = 'wave' | 'celebrate' | null

export const ROBOT_GESTURE_DURATION = { wave: 2.2, celebrate: 2.6 } as const

export interface RobotPose {
  headX: number; headY: number; headZ: number
  bodyY: number; bodyX: number; bodyZ: number
  leftArmX: number; leftArmY: number; leftArmZ: number
  rightArmX: number; rightArmY: number; rightArmZ: number
  leftLegX: number; rightLegX: number
  leftFootLift: number; rightFootLift: number
  eyeHeight: number; eyeWidth: number; eyeShift: number
  expression: number
  gesture: string
}

export interface RobotMotionInput {
  time: number
  phase: number
  mode: RobotMode
  personality: RobotPersonality
  gesture?: RobotGesture
  gestureTime?: number
  reducedMotion?: boolean
}

export function createRobotPose(): RobotPose {
  return {
    headX: 0, headY: 0, headZ: 0, bodyY: 0, bodyX: 0, bodyZ: 0,
    leftArmX: 0, leftArmY: 0, leftArmZ: 0, rightArmX: 0, rightArmY: 0, rightArmZ: 0,
    leftLegX: 0, rightLegX: 0, leftFootLift: 0, rightFootLift: 0,
    eyeHeight: 1, eyeWidth: 1, eyeShift: 0, expression: 0, gesture: 'idle',
  }
}

const offsets: Record<RobotPersonality, number> = {
  curious: 0.3, writer: 2.5, tester: 5, voice: 7.5, editor: 10, designer: 12.5,
  publisher: 15, analyst: 17.5, courier: 20,
}
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
const envelope = (time: number, duration: number) => smooth(time / 0.38) * smooth((duration - time) / 0.42)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** Reuses the caller's pose; animation remains independent of React renders and frame rate. */
export function sampleRobotPose(input: RobotMotionInput, pose: RobotPose): RobotPose {
  const { mode, personality, reducedMotion = false } = input
  const t = input.time + input.phase + offsets[personality]
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

  // Functional motion always owns the pose. Interactions cannot interrupt a delivery.
  if (mode === 'walking') {
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
    pose.rightArmX = -1.85
    pose.rightArmZ = 0.05
    pose.leftArmX = -0.25
    pose.headX = 0.04
    pose.headZ = 0
    pose.bodyY = 0
    pose.eyeWidth = 1.12
  } else {
    if (mode === 'working') {
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
      // Each occupation gets a staggered four-second habit followed by quiet time.
      const cycle = t % 24
      const habit = envelope(cycle, 4.1)
      const stretch = envelope(cycle - 13, 3.8)
      pose.headY = Math.sin(t * 0.43) * 0.17
      pose.eyeShift = Math.sin(t * 0.43) * 0.02
      if (habit > 0) {
        if (personality === 'voice') {
          pose.gesture = 'listen'
          pose.headX += Math.sin(t * 4.4) * 0.075 * habit
          pose.headZ = mix(pose.headZ, -0.1, habit)
          pose.leftArmX = mix(-0.08, 0.6, habit)
          pose.leftArmZ = mix(-0.12, -2.2, habit)
          pose.rightArmX -= (0.2 + Math.sin(t * 4.4) * 0.12) * habit
          pose.eyeHeight = mix(1, 0.7, habit)
        } else if (personality === 'tester') {
          pose.gesture = 'adjust-glasses'
          pose.headY = mix(pose.headY, 0.16, habit)
          pose.headX = mix(pose.headX, 0.12, habit)
          pose.rightArmX = mix(-0.08, 0.66, habit)
          pose.rightArmZ = mix(0.12, 2.3, habit)
          pose.eyeWidth = mix(1, 1.17, habit)
        } else if (personality === 'writer' || personality === 'analyst') {
          pose.gesture = 'think'
          pose.headX = mix(pose.headX, -0.13, habit)
          pose.headY = mix(pose.headY, personality === 'writer' ? 0.32 : -0.27, habit)
          pose.headZ = mix(pose.headZ, 0.16, habit)
          pose.rightArmX = mix(-0.08, -1.65, habit)
          pose.rightArmZ = mix(0.12, 0.4, habit)
          pose.eyeWidth = mix(1, 1.25, habit)
          pose.eyeHeight = mix(1, 0.78, habit)
        } else if (personality === 'designer') {
          pose.gesture = 'inspect'
          pose.headZ = mix(pose.headZ, Math.sin(t * 1.7) * 0.17, habit)
          pose.headY = mix(pose.headY, -0.18, habit)
          pose.leftArmX = mix(-0.08, -1.4, habit)
          pose.leftArmZ = mix(-0.12, -0.36, habit)
          pose.eyeWidth = mix(1, 1.18, habit)
        } else if (personality === 'editor') {
          pose.gesture = 'rhythm'
          pose.headX += Math.sin(t * 4) * 0.085 * habit
          pose.bodyZ = Math.sin(t * 2) * 0.025 * habit
          pose.rightArmX = mix(-0.08, -0.9 + Math.sin(t * 4) * 0.18, habit)
        } else {
          pose.gesture = 'look-around'
          pose.headY = mix(pose.headY, Math.sin(cycle * 1.6) * 0.43, habit)
          pose.headZ = mix(pose.headZ, -0.1, habit)
          pose.eyeWidth = mix(1, 1.13, habit)
          pose.leftArmX = mix(-0.08, -0.45, habit)
        }
      }
      if (stretch > 0) {
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

    const gestureTime = input.gestureTime ?? -1
    const gesture = input.gesture
    if (gesture && gestureTime >= 0 && gestureTime < ROBOT_GESTURE_DURATION[gesture]) {
      const strength = envelope(gestureTime, ROBOT_GESTURE_DURATION[gesture])
      pose.gesture = gesture
      pose.headY = mix(pose.headY, 0.3, strength)
      pose.headX = mix(pose.headX, -0.08, strength)
      pose.headZ = mix(pose.headZ, -0.06, strength)
      pose.eyeShift = mix(pose.eyeShift, 0.025, strength)
      pose.expression = strength
      pose.eyeHeight = mix(pose.eyeHeight, 0.62, strength)
      pose.eyeWidth = mix(pose.eyeWidth, 1.35, strength)
      if (reducedMotion) {
        // Still acknowledge the action, with a calm held pose instead of waving.
        pose.rightArmX = mix(pose.rightArmX, -0.8, strength)
        pose.rightArmZ = mix(pose.rightArmZ, 0.48, strength)
      } else if (gesture === 'wave') {
        pose.rightArmX = mix(pose.rightArmX, -0.12, strength)
        pose.rightArmZ = mix(pose.rightArmZ, 2.2 + Math.sin(gestureTime * 13) * 0.28, strength)
        pose.leftArmX = mix(pose.leftArmX, -0.2, strength)
        pose.bodyZ = -0.025 * strength
      } else {
        pose.leftArmX = mix(pose.leftArmX, -0.1, strength)
        pose.rightArmX = mix(pose.rightArmX, -0.1, strength)
        pose.leftArmZ = mix(pose.leftArmZ, -2.12 - Math.sin(gestureTime * 9) * 0.12, strength)
        pose.rightArmZ = mix(pose.rightArmZ, 2.12 + Math.sin(gestureTime * 9) * 0.12, strength)
        pose.bodyZ = Math.sin(gestureTime * 6) * 0.045 * strength
        pose.headZ = -Math.sin(gestureTime * 6) * 0.06 * strength
        pose.bodyY += 0.018 * strength
      }
    }
  }

  // Blink after expressions are applied so every expression can still blink.
  const blinkTime = t % (reducedMotion ? 6.2 : 4.7)
  const blink = blinkTime < 0.17 ? Math.abs(Math.cos(blinkTime / 0.17 * Math.PI)) : 1
  pose.eyeHeight *= Math.max(0.07, blink)
  return pose
}
