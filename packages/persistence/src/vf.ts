import {
  parseDocument,
  SCHEMA_VERSION,
  stableStringify,
  type SerializedDocument,
  type SerializedNode,
} from '@vectorforge/document';
import { applyMigrations, CURRENT_VF_VERSION } from './migrations';

/**
 * The `.vf` file format (ARCHITECTURE.md §11). A JSON envelope around the
 * document's serialized scene graph: deterministic (sorted keys), human
 * readable, round-trip lossless. V1 carries a single implicit page that reuses
 * the document package's node serialization, so encode/decode inherit its
 * exact-restoration and validation guarantees. `styles`/`components`/`comments`/
 * `versions` are reserved (present but empty) so V2+ additions populate fields
 * without bumping the structural schema.
 */
export interface VfDocumentMeta {
  readonly id: string;
  readonly title: string;
  /** App + schema that authored the file, e.g. `vectorforge/1.0`. */
  readonly schemaCreatedBy: string;
}

export interface VfPage {
  readonly id: string;
  readonly name: string;
  readonly rootIds: readonly string[];
  readonly nodes: readonly SerializedNode[];
}

export interface VfStyles {
  readonly colors: Record<string, unknown>;
  readonly text: Record<string, unknown>;
  readonly spacing: { readonly base: number };
}

export interface VfFile {
  readonly version: string;
  readonly document: VfDocumentMeta;
  readonly pages: readonly VfPage[];
  readonly styles: VfStyles;
  readonly components: readonly unknown[];
  readonly comments: readonly unknown[];
  readonly versions: readonly unknown[];
}

/** The result of decoding a `.vf`: a scene ready for `SceneGraph.fromJSON`, plus metadata. */
export interface DecodedVf {
  /** True when the file is newer/unmigratable — load it, but refuse to overwrite (§11.4). */
  readonly readOnly: boolean;
  /** The version the file declared (post-migration this equals the current schema). */
  readonly version: string;
  readonly document: VfDocumentMeta;
  /** Flattened scene `{ version, rootIds, nodes }` for `SceneGraph.fromJSON`. */
  readonly scene: SerializedDocument;
  /** The full (migrated) envelope — preserves reserved/unknown sections for re-save. */
  readonly raw: VfFile;
}

const DEFAULT_PAGE_ID = 'page-1';

function appTag(): string {
  return `vectorforge/${SCHEMA_VERSION}`;
}

function fail(message: string): never {
  throw new Error(`Invalid .vf file: ${message}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Build the canonical envelope from a serialized document (single implicit page). */
export function buildVfFile(doc: SerializedDocument, meta: Partial<VfDocumentMeta> = {}): VfFile {
  return {
    version: CURRENT_VF_VERSION,
    document: {
      id: meta.id ?? 'doc-1',
      title: meta.title ?? 'Untitled',
      schemaCreatedBy: meta.schemaCreatedBy ?? appTag(),
    },
    pages: [{ id: DEFAULT_PAGE_ID, name: 'Page 1', rootIds: [...doc.rootIds], nodes: doc.nodes }],
    styles: { colors: {}, text: {}, spacing: { base: 8 } },
    components: [],
    comments: [],
    versions: [],
  };
}

/** Serialize a document to deterministic `.vf` text (sorted keys, pretty-printed). */
export function encodeVf(doc: SerializedDocument, meta: Partial<VfDocumentMeta> = {}): string {
  return stableStringify(buildVfFile(doc, meta));
}

/** Shape-validate the envelope's structure (per-node validation happens in fromJSON). */
function validateEnvelope(raw: unknown): asserts raw is Record<string, unknown> {
  if (!isObject(raw)) fail('file is not a JSON object');
  if (typeof raw.version !== 'string') fail('file.version must be a string');
  if (!isObject(raw.document)) fail('file.document must be an object');
  if (typeof (raw.document as Record<string, unknown>).id !== 'string') {
    fail('file.document.id must be a string');
  }
  if (!Array.isArray(raw.pages)) fail('file.pages must be an array');
  for (const page of raw.pages) {
    if (!isObject(page)) fail('each page must be an object');
    if (!Array.isArray(page.rootIds)) fail('page.rootIds must be an array');
    if (!Array.isArray(page.nodes)) fail('page.nodes must be an array');
  }
}

/** Fill in reserved sections an older/partial file may omit (forward compatibility). */
function normalizeEnvelope(raw: Record<string, unknown>): VfFile {
  const doc = raw.document as Record<string, unknown>;
  return {
    version: String(raw.version),
    document: {
      id: String(doc.id),
      title: typeof doc.title === 'string' ? doc.title : 'Untitled',
      schemaCreatedBy: typeof doc.schemaCreatedBy === 'string' ? doc.schemaCreatedBy : appTag(),
    },
    pages: (raw.pages as VfPage[]).map((p) => ({
      id: typeof p.id === 'string' ? p.id : DEFAULT_PAGE_ID,
      name: typeof p.name === 'string' ? p.name : 'Page',
      rootIds: [...p.rootIds],
      nodes: [...p.nodes],
    })),
    styles: isObject(raw.styles)
      ? (raw.styles as unknown as VfStyles)
      : { colors: {}, text: {}, spacing: { base: 8 } },
    components: Array.isArray(raw.components) ? raw.components : [],
    comments: Array.isArray(raw.comments) ? raw.comments : [],
    versions: Array.isArray(raw.versions) ? raw.versions : [],
  };
}

/** Flatten all pages into one `SerializedDocument` (V1 has a single page). */
function flattenPages(file: VfFile): SerializedDocument {
  const rootIds: string[] = [];
  const nodes: SerializedNode[] = [];
  for (const page of file.pages) {
    rootIds.push(...page.rootIds);
    nodes.push(...page.nodes);
  }
  return { version: SCHEMA_VERSION, rootIds, nodes };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error: unknown) {
    fail(`not valid JSON (${error instanceof Error ? error.message : 'parse error'})`);
  }
}

/**
 * Parse + validate + migrate a `.vf` file. Throws on a malformed envelope or
 * malformed JSON (the caller surfaces recovery UI); returns a `readOnly` flag
 * for files newer than this app or that cannot be fully migrated. The returned
 * `scene` is handed to `SceneGraph.fromJSON`, which performs per-node validation
 * and the dangling/cyclic integrity check (§11.3).
 */
export function decodeVf(input: string | unknown): DecodedVf {
  const raw = typeof input === 'string' ? safeParse(input) : input;
  validateEnvelope(raw);

  const migrated = applyMigrations(raw, raw.version);
  const file = normalizeEnvelope(migrated.file);
  const scene = flattenPages(file);
  // Light shape-check now; SceneGraph.fromJSON does the deep per-node validation.
  parseDocument(scene);

  return {
    readOnly: migrated.readOnly,
    version: migrated.version,
    document: file.document,
    scene,
    raw: file,
  };
}
