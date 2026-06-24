import { describe, expect, it } from 'vitest';
import { Matrix3 } from '@vectorforge/geometry';
import { paintItem, type RenderItem } from '@vectorforge/renderer';
import { RecordingContext } from './recording-context';

const base = { worldMatrix: Matrix3.IDENTITY, opacity: 1, worldBounds: null };

function paint(item: RenderItem) {
  const ctx = new RecordingContext();
  paintItem(ctx, item);
  return ctx;
}

describe('paintItem — per-kind drawing', () => {
  it('frame: fills its background rect', () => {
    const ctx = paint({
      ...base,
      id: 'f',
      kind: 'frame',
      size: { w: 100, h: 80 },
      backgroundColor: '#fff',
      clipsContent: true,
    });
    const fill = ctx.opsOf('fillRect')[0]!;
    expect(fill.args.slice(0, 4)).toEqual([0, 0, 100, 80]);
    expect(fill.args[4]).toBe('#fff');
  });

  it('rectangle: sharp corners use fillRect, rounded corners trace a path then fill', () => {
    const sharp = paint({
      ...base,
      id: 'r',
      kind: 'rectangle',
      size: { w: 40, h: 20 },
      fill: '#7C5CFF',
      cornerRadius: 0,
    });
    expect(sharp.opsOf('fillRect')).toHaveLength(1);
    expect(sharp.opsOf('quadraticCurveTo')).toHaveLength(0);

    const rounded = paint({
      ...base,
      id: 'r',
      kind: 'rectangle',
      size: { w: 40, h: 20 },
      fill: '#7C5CFF',
      cornerRadius: 6,
    });
    expect(rounded.opsOf('quadraticCurveTo')).toHaveLength(4); // four corners
    expect(rounded.opsOf('fill')).toHaveLength(1);
    expect(rounded.opsOf('fillRect')).toHaveLength(0);
  });

  it('rectangle: corner radius is clamped to half the shorter side', () => {
    // radius 999 on a 40×20 rect clamps to 10; the first arc control point sits at r,0.
    const ctx = paint({
      ...base,
      id: 'r',
      kind: 'rectangle',
      size: { w: 40, h: 20 },
      fill: '#000',
      cornerRadius: 999,
    });
    const moveTo = ctx.opsOf('moveTo')[0]!;
    expect(moveTo.args).toEqual([10, 0]);
  });

  it('ellipse: draws a centered ellipse and fills', () => {
    const ctx = paint({ ...base, id: 'e', kind: 'ellipse', size: { w: 40, h: 20 }, fill: '#0AF' });
    const e = ctx.opsOf('ellipse')[0]!;
    expect(e.args.slice(0, 4)).toEqual([20, 10, 20, 10]); // center (20,10), radii (20,10)
    expect(ctx.opsOf('fill')).toHaveLength(1);
  });

  it('line: strokes from a to b with the given width', () => {
    const ctx = paint({
      ...base,
      id: 'l',
      kind: 'line',
      a: { x: 0, y: 0 },
      b: { x: 30, y: 10 },
      stroke: '#111',
      strokeWidth: 2,
    });
    expect(ctx.opsOf('moveTo')[0]!.args).toEqual([0, 0]);
    expect(ctx.opsOf('lineTo')[0]!.args).toEqual([30, 10]);
    expect(ctx.opsOf('stroke')[0]!.args).toEqual(['#111', 2]);
  });

  it('text: draws one fillText per line at the line-height step', () => {
    const ctx = paint({
      ...base,
      id: 't',
      kind: 'text',
      content: 'a\nb',
      fontFamily: 'Inter',
      fontWeight: 600,
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 0,
      textAlign: 'left',
      fill: '#222',
      size: null,
    });
    const lines = ctx.opsOf('fillText');
    expect(lines).toHaveLength(2);
    expect(lines[0]!.args.slice(0, 3)).toEqual(['a', 0, 0]);
    expect(lines[1]!.args.slice(0, 3)).toEqual(['b', 0, 20]);
    expect(lines[0]!.args[5]).toBe('600 16px Inter'); // font
  });

  it('text: applies non-zero letterSpacing to the painted run', () => {
    const ctx = paint({
      ...base,
      id: 't',
      kind: 'text',
      content: 'x',
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 12,
      lineHeight: 14,
      letterSpacing: -0.5,
      textAlign: 'left',
      fill: '#000',
      size: null,
    });
    // letterSpacing is recorded alongside the fillText call (index 7).
    expect(ctx.opsOf('fillText')[0]!.args[7]).toBe('-0.5px');
  });

  it('text: center/right alignment anchors against the fixed box width', () => {
    const center = paint({
      ...base,
      id: 't',
      kind: 'text',
      content: 'x',
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0,
      textAlign: 'center',
      fill: '#000',
      size: { w: 100, h: 20 },
    });
    expect(center.opsOf('fillText')[0]!.args[1]).toBe(50); // half of width
    expect(center.opsOf('fillText')[0]!.args[6]).toBe('center');
  });

  it('image: renders a neutral placeholder box with diagonals', () => {
    const ctx = paint({
      ...base,
      id: 'i',
      kind: 'image',
      size: { w: 50, h: 50 },
      assetRef: 'x',
      fit: 'cover',
    });
    expect(ctx.opsOf('fillRect')[0]!.args.slice(0, 4)).toEqual([0, 0, 50, 50]);
    expect(ctx.opsOf('lineTo').length).toBeGreaterThanOrEqual(2); // two crossing diagonals
    expect(ctx.opsOf('stroke')).toHaveLength(1);
  });
});
