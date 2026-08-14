import { describe, it, expect } from 'vitest'
import { calculateLevelFromXP } from '../gamification'

describe('calculateLevelFromXP', () => {
  it('calculates level 1 for 0 XP', () => {
    const res = calculateLevelFromXP(0)
    expect(res.level).toBe(1)
    expect(res.totalXP).toBe(0)
    expect(res.xpForCurrentLevel).toBe(0)
    expect(res.xpForNextLevel).toBe(50)
    expect(res.currentProgressXP).toBe(0)
    expect(res.progressPct).toBe(0)
  })

  it('calculates level 1 progression correctly', () => {
    const res = calculateLevelFromXP(25)
    expect(res.level).toBe(1)
    expect(res.totalXP).toBe(25)
    expect(res.currentProgressXP).toBe(25)
    expect(res.neededXPForNextLevel).toBe(50)
    expect(res.progressPct).toBe(50)
  })

  it('levels up to level 2 at exactly 50 XP', () => {
    const res = calculateLevelFromXP(50)
    expect(res.level).toBe(2)
    expect(res.xpForCurrentLevel).toBe(50)
    expect(res.xpForNextLevel).toBe(200) // (2^2)*50
    expect(res.currentProgressXP).toBe(0)
    expect(res.progressPct).toBe(0)
  })

  it('levels up to level 3 at 200 XP', () => {
    const res = calculateLevelFromXP(200)
    expect(res.level).toBe(3)
    expect(res.xpForCurrentLevel).toBe(200)
    expect(res.xpForNextLevel).toBe(450) // (3^2)*50
    expect(res.currentProgressXP).toBe(0)
  })

  it('handles negative XP gracefully by clamping to 0', () => {
    const res = calculateLevelFromXP(-100)
    expect(res.level).toBe(1)
    expect(res.totalXP).toBe(0)
  })

  it('caps progressPct at 100 max', () => {
    const res = calculateLevelFromXP(49)
    expect(res.progressPct).toBeLessThanOrEqual(100)
  })
})
