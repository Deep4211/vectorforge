import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  screenToWorld,
  Vector2,
  viewportMatrix,
  worldToScreen,
  zoomViewportAt,
  type Viewport,
} from '@vectorforge/geometry';

const VIEWPORT: Viewport = { panX: 90, panY: 46, zoom: 0.82 };

describe('viewport coordinate pipeline', () => {
  it('worldToScreen and screenToWorld are inverses', () => {
    const world = new Vector2(123, -45);
    const screen = worldToScreen(world, VIEWPORT);
    expect(screenToWorld(screen, VIEWPORT).equals(world, 1e-9)).toBe(true);
  });

  it('worldToScreen matches the explicit formula', () => {
    expect(
      worldToScreen({ x: 10, y: 20 }, VIEWPORT).equals(new Vector2(10 * 0.82 + 90, 20 * 0.82 + 46)),
    ).toBe(true);
  });

  it('viewportMatrix.transformPoint equals worldToScreen', () => {
    const m = viewportMatrix(VIEWPORT);
    const world = new Vector2(33, 77);
    expect(m.transformPoint(world).equals(worldToScreen(world, VIEWPORT), 1e-9)).toBe(true);
  });

  it('cursor-anchored zoom keeps the world point under the cursor fixed (PRD CAN-003)', () => {
    const cursor = new Vector2(400, 300);
    const worldBefore = screenToWorld(cursor, VIEWPORT);
    const zoomed = zoomViewportAt(VIEWPORT, cursor, 2);
    const worldAfter = screenToWorld(cursor, zoomed);
    expect(worldAfter.equals(worldBefore, 1e-9)).toBe(true);
    expect(zoomed.zoom).toBe(2);
  });

  it('clamps zoom to [MIN_ZOOM, MAX_ZOOM]', () => {
    expect(zoomViewportAt(VIEWPORT, { x: 0, y: 0 }, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomViewportAt(VIEWPORT, { x: 0, y: 0 }, 0.0001).zoom).toBe(MIN_ZOOM);
    expect(MIN_ZOOM).toBe(0.05);
    expect(MAX_ZOOM).toBe(4);
  });

  it('keeps the cursor anchored even when the requested zoom is clamped', () => {
    const cursor = new Vector2(400, 300);
    for (const requested of [100, 0.0001]) {
      const before = screenToWorld(cursor, VIEWPORT);
      const zoomed = zoomViewportAt(VIEWPORT, cursor, requested);
      expect(screenToWorld(cursor, zoomed).equals(before, 1e-9)).toBe(true);
    }
  });
});
