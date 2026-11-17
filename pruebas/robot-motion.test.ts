import test from 'node:test'
import assert from 'node:assert/strict'
import { createRobotPose, sampleRobotPose, ROBOT_GESTURE_DURATION, type RobotMotionInput, type RobotPersonality } from '../src/components/robotMotion'

const base: RobotMotionInput = { time: 3, phase: 0.4, mode: 'idle', personality: 'tester' }
const sample = (input: Partial<RobotMotionInput> = {}) => sampleRobotPose({ ...base, ...input }, createRobotPose())

test('a greeting or celebration cannot change the courier walking or delivery pose', () => {
  for (const mode of ['walking', 'delivering'] as const) {
    for (const time of [0, 0.2, 0.8, 1.6, 2.2]) {
      const ordinary = sample({ mode, time })
      for (const gesture of ['wave', 'celebrate'] as const) {
        assert.deepEqual(sample({ mode, time, gesture, gestureTime: 0.9 }), ordinary)
      }
    }
  }
})

test('interactions end, resume the task and keep both feet planted at a desk', () => {
  for (const mode of ['idle', 'working'] as const) {
    for (const gesture of ['wave', 'celebrate'] as const) {
      assert.equal(sample({ mode, gesture, gestureTime: 1 }).gesture, gesture)
      assert.deepEqual(sample({ mode, gesture, gestureTime: ROBOT_GESTURE_DURATION[gesture] }), sample({ mode }))
      for (let t = 0; t < ROBOT_GESTURE_DURATION[gesture]; t += 0.1) {
        const pose = sample({ mode, gesture, gestureTime: t })
        assert.equal(pose.leftFootLift, 0)
        assert.equal(pose.rightFootLift, 0)
        assert.equal(pose.leftLegX, 0)
        assert.equal(pose.rightLegX, 0)
      }
    }
  }
})

test('reduced motion stops repeated idle and typing movement while retaining functional walking', () => {
  const withoutBlink = (pose: ReturnType<typeof sample>) => { const { eyeHeight: _blink, ...rest } = pose; return rest }
  for (const mode of ['idle', 'working'] as const) {
    const initial = withoutBlink(sample({ mode, reducedMotion: true, time: 0 }))
    for (let time = 0; time < 26; time += 0.25) assert.deepEqual(withoutBlink(sample({ mode, reducedMotion: true, time })), initial)
  }
  const walking = sample({ mode: 'walking', reducedMotion: true, time: 0.45 })
  assert.notEqual(walking.leftLegX, 0)
  assert.equal(walking.leftLegX, -walking.rightLegX)
})

test('every personality animates through its habit and a stretch without invalid joints', () => {
  const personalities: RobotPersonality[] = ['curious', 'writer', 'tester', 'voice', 'editor', 'designer', 'publisher', 'analyst']
  for (const personality of personalities) {
    const gestures = new Set<string>()
    for (let time = 0; time < 24; time += 0.1) {
      const pose = sample({ personality, time })
      gestures.add(pose.gesture)
      for (const value of Object.values(pose)) if (typeof value === 'number') assert.ok(Number.isFinite(value))
      assert.equal(pose.leftFootLift + pose.rightFootLift, 0)
    }
    assert.ok(gestures.has('stretch'), `${personality} stretches`)
    assert.ok(gestures.size >= 3, `${personality} has a distinct habit and quiet intervals`)
  }
})
