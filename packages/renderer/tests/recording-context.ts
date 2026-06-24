import type { CanvasLike, Context2DLike } from '@vectorforge/renderer';

/** One recorded drawing call: the method name and its arguments. */
export interface Call {
  readonly op: string;
  readonly args: readonly unknown[];
}

/**
 * A minimal in-memory {@link Context2DLike} that records every call and state
 * mutation, so tests can assert the exact, deterministic draw sequence a real
 * Canvas2D context would receive (RND-9) without a DOM.
 */
export class RecordingContext implements Context2DLike {
  readonly calls: Call[] = [];

  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  lineWidth = 1;
  lineJoin: CanvasLineJoin = 'miter';
  globalAlpha = 1;
  font = '10px sans-serif';
  letterSpacing = '0px';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';

  private record(op: string, ...args: unknown[]): void {
    this.calls.push({ op, args });
  }

  /** Calls of a given op, in order. */
  opsOf(op: string): Call[] {
    return this.calls.filter((c) => c.op === op);
  }

  /** Ordered list of op names (handy for sequence assertions). */
  sequence(): string[] {
    return this.calls.map((c) => c.op);
  }

  save(): void {
    this.record('save');
  }
  restore(): void {
    this.record('restore');
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.record('setTransform', a, b, c, d, e, f);
  }
  clearRect(x: number, y: number, w: number, h: number): void {
    this.record('clearRect', x, y, w, h);
  }
  beginPath(): void {
    this.record('beginPath');
  }
  closePath(): void {
    this.record('closePath');
  }
  moveTo(x: number, y: number): void {
    this.record('moveTo', x, y);
  }
  lineTo(x: number, y: number): void {
    this.record('lineTo', x, y);
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.record('rect', x, y, w, h);
  }
  arc(x: number, y: number, r: number, start: number, end: number, ccw?: boolean): void {
    this.record('arc', x, y, r, start, end, ccw);
  }
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    start: number,
    end: number,
    ccw?: boolean,
  ): void {
    this.record('ellipse', x, y, rx, ry, rotation, start, end, ccw);
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.record('quadraticCurveTo', cpx, cpy, x, y);
  }
  fill(): void {
    this.record('fill', this.fillStyle, this.globalAlpha);
  }
  stroke(): void {
    this.record('stroke', this.strokeStyle, this.lineWidth);
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.record('fillRect', x, y, w, h, this.fillStyle, this.globalAlpha);
  }
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this.record(
      'fillText',
      text,
      x,
      y,
      maxWidth,
      this.fillStyle,
      this.font,
      this.textAlign,
      this.letterSpacing,
    );
  }
  clip(): void {
    this.record('clip');
  }
}

/** A fake canvas that hands out a single {@link RecordingContext}. */
export class RecordingCanvas implements CanvasLike {
  width = 0;
  height = 0;
  readonly context = new RecordingContext();

  getContext(_contextId: '2d'): Context2DLike | null {
    return this.context;
  }
}
