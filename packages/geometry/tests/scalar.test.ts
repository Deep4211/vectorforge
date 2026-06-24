import { describe, expect, it } from 'vitest';
import {
  approxEqual,
  assertFinite,
  clamp,
  clampCornerRadius,
  degToRad,
  EPSILON,
  isFiniteNumber,
  lerp,
  normalizeRotation,
  radToDeg,
} from '@vectorforge/geometry';

describe('scalar utilities', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('approxEqual respects epsilon', () => {
    expect(approxEqual(1, 1 + EPSILON / 2)).toBe(true);
    expect(approxEqual(1, 1.1)).toBe(false);
    expect(approxEqual(1, 1.1, 0.2)).toBe(true);
  });

  it('converts degrees and radians round-trip', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
    expect(radToDeg(degToRad(123.45))).toBeCloseTo(123.45);
  });

  it('lerps', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('normalizes rotation into [0, 360)', () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(370)).toBe(10);
    expect(normalizeRotation(-10)).toBe(350);
    expect(normalizeRotation(-730)).toBe(350);
  });

  it('clamps corner radius to half the shorter side and rejects negatives', () => {
    expect(clampCornerRadius(5, 100, 100)).toBe(5);
    expect(clampCornerRadius(80, 100, 40)).toBe(20); // half of shorter side (40)
    expect(clampCornerRadius(-5, 100, 100)).toBe(0);
    expect(clampCornerRadius(80, -100, -40)).toBe(20); // sign-independent
  });

  it('guards finite numbers', () => {
    expect(isFiniteNumber(1)).toBe(true);
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber('1')).toBe(false);
    expect(isFiniteNumber(null)).toBe(false);
  });

  it('normalizeRotation stays in the half-open [0, 360) range at float edges', () => {
    expect(normalizeRotation(-1e-16)).toBe(0); // would round up to exactly 360 without the guard
    expect(Object.is(normalizeRotation(-360), 0)).toBe(true); // +0, never -0
    expect(normalizeRotation(720)).toBe(0);
  });

  it('assertFinite returns finite numbers and throws on NaN/Infinity', () => {
    expect(assertFinite(42)).toBe(42);
    expect(() => assertFinite(NaN)).toThrow(RangeError);
    expect(() => assertFinite(Infinity, 'zoom')).toThrow(/zoom/);
  });
});
