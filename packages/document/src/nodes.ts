import type { Point } from '@vectorforge/geometry';
import { clamp, clampCornerRadius, Transform } from '@vectorforge/geometry';
import type {
  BaseNode,
  Color,
  EllipseNode,
  FrameNode,
  GroupNode,
  ImageFit,
  ImageNode,
  LineNode,
  NodeId,
  RectangleNode,
  SceneNode,
  Size,
  TextAlign,
  TextNode,
} from './types';

/**
 * Node factories and immutable update helpers.
 *
 * Factories return a fully-formed, root-level node (`parentId: null`,
 * `childIds: []`); the {@link SceneGraph} owns all parent/child linkage. Update
 * helpers return a new node and never mutate their input (the immutability rule;
 * the only mutators in the package are the `SceneGraph` container methods).
 */

interface BaseInput {
  readonly id: NodeId;
  readonly name?: string;
  readonly transform?: Transform;
  readonly visibility?: boolean;
  readonly locked?: boolean;
  readonly opacity?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

function base(input: BaseInput, defaultName: string): Omit<BaseNode, 'type'> {
  return {
    id: input.id,
    name: input.name?.trim() || defaultName,
    transform: input.transform ?? Transform.IDENTITY,
    visibility: input.visibility ?? true,
    locked: input.locked ?? false,
    opacity: input.opacity != null ? clamp(input.opacity, 0, 1) : 1,
    // Copy so a caller-held reference can't later mutate the node's metadata.
    metadata: input.metadata ? { ...input.metadata } : {},
    parentId: null,
    childIds: [],
  };
}

/** Copy a size so the node never shares the caller's object reference. */
function copySize(size: Size): Size {
  return { w: size.w, h: size.h };
}

// ---- factories ----------------------------------------------------------

export interface FrameInput extends BaseInput {
  readonly size: Size;
  readonly clipsContent?: boolean;
  readonly backgroundColor?: Color;
}
export function createFrame(input: FrameInput): FrameNode {
  return {
    ...base(input, 'Frame'),
    type: 'frame',
    size: copySize(input.size),
    clipsContent: input.clipsContent ?? true,
    backgroundColor: input.backgroundColor ?? '#FFFFFF',
  };
}

export type GroupInput = BaseInput;
export function createGroup(input: GroupInput): GroupNode {
  return { ...base(input, 'Group'), type: 'group' };
}

export interface RectangleInput extends BaseInput {
  readonly size: Size;
  readonly fill?: Color;
  readonly cornerRadius?: number;
}
export function createRectangle(input: RectangleInput): RectangleNode {
  return {
    ...base(input, 'Rectangle'),
    type: 'rectangle',
    size: copySize(input.size),
    fill: input.fill ?? '#000000',
    cornerRadius: clampCornerRadius(input.cornerRadius ?? 0, input.size.w, input.size.h),
  };
}

export interface EllipseInput extends BaseInput {
  readonly size: Size;
  readonly fill?: Color;
}
export function createEllipse(input: EllipseInput): EllipseNode {
  return {
    ...base(input, 'Ellipse'),
    type: 'ellipse',
    size: copySize(input.size),
    fill: input.fill ?? '#000000',
  };
}

export interface LineInput extends BaseInput {
  readonly a: Point;
  readonly b: Point;
  readonly stroke?: Color;
  readonly strokeWidth?: number;
}
export function createLine(input: LineInput): LineNode {
  return {
    ...base(input, 'Line'),
    type: 'line',
    a: { x: input.a.x, y: input.a.y },
    b: { x: input.b.x, y: input.b.y },
    stroke: input.stroke ?? '#000000',
    strokeWidth: Math.max(0, input.strokeWidth ?? 1),
  };
}

export interface TextInput extends BaseInput {
  readonly content: string;
  readonly fontFamily?: string;
  readonly fontWeight?: number;
  readonly fontSize?: number;
  readonly lineHeight?: number;
  readonly letterSpacing?: number;
  readonly textAlign?: TextAlign;
  readonly fill?: Color;
  readonly size?: Size | null;
}
export function createText(input: TextInput): TextNode {
  return {
    ...base(input, 'Text'),
    type: 'text',
    content: input.content,
    fontFamily: input.fontFamily ?? 'Onest',
    fontWeight: input.fontWeight ?? 400,
    fontSize: input.fontSize ?? 16,
    lineHeight: input.lineHeight ?? 20,
    letterSpacing: input.letterSpacing ?? 0,
    textAlign: input.textAlign ?? 'left',
    fill: input.fill ?? '#000000',
    size: input.size ? copySize(input.size) : null,
  };
}

export interface ImageInput extends BaseInput {
  readonly size: Size;
  readonly assetRef: string;
  readonly fit?: ImageFit;
  readonly altText?: string;
}
export function createImage(input: ImageInput): ImageNode {
  return {
    ...base(input, 'Image'),
    type: 'image',
    size: copySize(input.size),
    assetRef: input.assetRef,
    fit: input.fit ?? 'fill',
    altText: input.altText ?? '',
  };
}

// ---- immutable base-field updates (preserve the concrete node type) -----

export function withName<T extends SceneNode>(node: T, name: string): T {
  const trimmed = name.trim();
  return trimmed === '' ? node : ({ ...node, name: trimmed } as T);
}

export function withTransform<T extends SceneNode>(node: T, transform: Transform): T {
  return { ...node, transform } as T;
}

export function withVisibility<T extends SceneNode>(node: T, visibility: boolean): T {
  return { ...node, visibility } as T;
}

export function withLocked<T extends SceneNode>(node: T, locked: boolean): T {
  return { ...node, locked } as T;
}

export function withOpacity<T extends SceneNode>(node: T, opacity: number): T {
  return { ...node, opacity: clamp(opacity, 0, 1) } as T;
}

export function withMetadata<T extends SceneNode>(
  node: T,
  metadata: Readonly<Record<string, unknown>>,
): T {
  return { ...node, metadata: { ...metadata } } as T;
}
