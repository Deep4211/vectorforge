import { clamp, Transform, Vector2 } from '@vectorforge/geometry';
import type {
  NodeType,
  SceneNode,
  SerializedDocument,
  SerializedNode,
  SerializedTransform,
} from './types';

/**
 * Node (de)serialization with **deterministic** output (DOC-9) and **validation
 * on load** (DOC-10/DOC-11). The `Transform` value object is lowered to plain
 * data; everything else is already JSON-compatible. A `serialize → deserialize`
 * round trip reproduces the document exactly. Loading validates both the common
 * base fields **and** the type-specific payload, so a corrupted document fails
 * safe (throws) rather than admitting a structurally-invalid node that crashes a
 * later consumer.
 */

const NODE_TYPES: ReadonlySet<string> = new Set<NodeType>([
  'frame',
  'group',
  'rectangle',
  'ellipse',
  'line',
  'text',
  'image',
]);
const TEXT_ALIGNS: ReadonlySet<string> = new Set(['left', 'center', 'right', 'justify']);
const IMAGE_FITS: ReadonlySet<string> = new Set(['fill', 'contain', 'cover']);

function serializeTransform(t: Transform): SerializedTransform {
  return {
    position: { x: t.position.x, y: t.position.y },
    rotation: t.rotation,
    scale: { x: t.scale.x, y: t.scale.y },
  };
}

function deserializeTransform(t: SerializedTransform): Transform {
  return new Transform(
    new Vector2(t.position.x, t.position.y),
    t.rotation,
    new Vector2(t.scale.x, t.scale.y),
  );
}

export function serializeNode(node: SceneNode): SerializedNode {
  const { transform, ...rest } = node;
  return { ...rest, transform: serializeTransform(transform) } as SerializedNode;
}

function fail(message: string): never {
  throw new Error(`Invalid document: ${message}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSize(value: unknown): boolean {
  return isObject(value) && isFiniteNum(value.w) && isFiniteNum(value.h);
}

function isPoint(value: unknown): boolean {
  return isObject(value) && isFiniteNum(value.x) && isFiniteNum(value.y);
}

/** Validate the type-specific payload of an already-base-validated node (DOC-10/DOC-11). */
function validateTypeSpecific(id: string, type: string, d: Record<string, unknown>): void {
  const num = (k: string): void => {
    if (!isFiniteNum(d[k])) fail(`node ${id} ${type}.${k} must be a finite number`);
  };
  const str = (k: string): void => {
    if (typeof d[k] !== 'string') fail(`node ${id} ${type}.${k} must be a string`);
  };
  const sized = (k: string): void => {
    if (!isSize(d[k])) fail(`node ${id} ${type}.${k} must be { w, h } finite numbers`);
  };

  switch (type) {
    case 'frame':
      sized('size');
      if (typeof d.clipsContent !== 'boolean')
        fail(`node ${id} frame.clipsContent must be boolean`);
      str('backgroundColor');
      return;
    case 'group':
      return;
    case 'rectangle':
      sized('size');
      str('fill');
      num('cornerRadius');
      return;
    case 'ellipse':
      sized('size');
      str('fill');
      return;
    case 'line':
      if (!isPoint(d.a)) fail(`node ${id} line.a must be a finite point`);
      if (!isPoint(d.b)) fail(`node ${id} line.b must be a finite point`);
      str('stroke');
      num('strokeWidth');
      return;
    case 'text':
      str('content');
      str('fontFamily');
      num('fontWeight');
      num('fontSize');
      num('lineHeight');
      num('letterSpacing');
      if (!TEXT_ALIGNS.has(d.textAlign as string)) fail(`node ${id} text.textAlign is invalid`);
      str('fill');
      if (d.size !== null && !isSize(d.size)) fail(`node ${id} text.size must be { w, h } or null`);
      return;
    case 'image':
      sized('size');
      str('assetRef');
      if (!IMAGE_FITS.has(d.fit as string)) fail(`node ${id} image.fit is invalid`);
      str('altText');
      return;
    default:
      fail(`node ${id} has unknown type "${type}"`);
  }
}

/** Validate and reconstruct a single node from its serialized form (DOC-10). */
export function deserializeNode(data: unknown): SceneNode {
  if (!isObject(data)) fail('node is not an object');
  const { id, type, name, visibility, locked, opacity, metadata, parentId, childIds, transform } =
    data;

  if (typeof id !== 'string' || id === '') fail('node.id must be a non-empty string');
  if (typeof type !== 'string' || !NODE_TYPES.has(type))
    fail(`node ${id} has unknown type "${String(type)}"`);
  if (typeof name !== 'string' || name === '') fail(`node ${id} has an empty name`);
  if (typeof visibility !== 'boolean') fail(`node ${id} visibility must be boolean`);
  if (typeof locked !== 'boolean') fail(`node ${id} locked must be boolean`);
  if (!isFiniteNum(opacity)) fail(`node ${id} opacity must be a finite number`);
  if (!isObject(metadata)) fail(`node ${id} metadata must be an object`);
  if (parentId !== null && typeof parentId !== 'string')
    fail(`node ${id} parentId must be a string or null`);
  if (!Array.isArray(childIds) || !childIds.every((c) => typeof c === 'string')) {
    fail(`node ${id} childIds must be an array of strings`);
  }
  if (!isSerializedTransform(transform)) fail(`node ${id} has an invalid transform`);
  validateTypeSpecific(id, type, data);

  // opacity is clamped to [0,1] on load for DOC-11 sanity; the transform is rebuilt
  // (its constructor floors zero scale and normalizes rotation).
  return {
    ...data,
    opacity: clamp(opacity, 0, 1),
    transform: deserializeTransform(transform),
  } as unknown as SceneNode;
}

function isSerializedTransform(value: unknown): value is SerializedTransform {
  if (!isObject(value)) return false;
  const { position, rotation, scale } = value;
  return (
    isObject(position) &&
    isFiniteNum(position.x) &&
    isFiniteNum(position.y) &&
    isFiniteNum(rotation) &&
    isObject(scale) &&
    isFiniteNum(scale.x) &&
    isFiniteNum(scale.y)
  );
}

/** Build a deterministic serialized document: nodes sorted by id, root order preserved. */
export function serializeDocument(
  nodes: Iterable<SceneNode>,
  rootIds: readonly string[],
  version: string,
): SerializedDocument {
  const serialized = [...nodes]
    .map(serializeNode)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { version, rootIds: [...rootIds], nodes: serialized };
}

/** Deterministic JSON string: keys sorted recursively so files diff cleanly (DOC-9). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value), null, 2);
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (isObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeysDeep(value[key]);
    }
    return out;
  }
  return value;
}

/** Parse + shape-validate a serialized document (DOC-10). Throws on malformed input. */
export function parseDocument(input: string | unknown): SerializedDocument {
  const raw: unknown = typeof input === 'string' ? safeJsonParse(input) : input;
  if (!isObject(raw)) fail('document is not an object');
  if (typeof raw.version !== 'string') fail('document.version must be a string');
  if (!Array.isArray(raw.rootIds) || !raw.rootIds.every((r) => typeof r === 'string')) {
    fail('document.rootIds must be an array of strings');
  }
  if (!Array.isArray(raw.nodes)) fail('document.nodes must be an array');
  // Per-node validation happens in deserializeNode (called by SceneGraph.fromJSON).
  return raw as unknown as SerializedDocument;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error: unknown) {
    fail(`not valid JSON (${error instanceof Error ? error.message : 'parse error'})`);
  }
}
