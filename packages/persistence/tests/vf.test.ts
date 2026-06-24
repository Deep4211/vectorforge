import { describe, expect, it } from 'vitest';
import {
  createFrame,
  createLine,
  createRectangle,
  createText,
  SceneGraph,
} from '@vectorforge/document';
import {
  applyMigrations,
  compareVersions,
  CURRENT_VF_VERSION,
  decodeVf,
  encodeVf,
  parseVersion,
  type Migration,
} from '@vectorforge/persistence';

// Build the fixture without importing @vectorforge/geometry — persistence may
// depend only on [document, shared] (ENGINE_CONTRACT §6); node factories accept
// plain inputs and default to the identity transform.
function sampleScene(): SceneGraph {
  const g = SceneGraph.empty();
  g.add(createFrame({ id: 'f', size: { w: 200, h: 200 } }));
  g.add(createRectangle({ id: 'r', size: { w: 40, h: 30 }, fill: '#7C5CFF' }), 'f');
  g.add(createText({ id: 't', content: 'Hi', size: { w: 80, h: 24 } }), 'f');
  g.add(createLine({ id: 'l', a: { x: 0, y: 0 }, b: { x: 50, y: 50 } }));
  return g;
}

describe('.vf encode/decode', () => {
  it('round-trips a document losslessly (encode → decode → fromJSON → toJSON)', () => {
    const scene = sampleScene();
    const original = scene.toJSON();

    const text = encodeVf(original, { id: 'doc-1', title: 'My Design' });
    const decoded = decodeVf(text);
    expect(decoded.readOnly).toBe(false);
    expect(decoded.document.title).toBe('My Design');

    const rebuilt = SceneGraph.fromJSON(decoded.scene);
    expect(rebuilt.toJSON()).toEqual(original); // exact restoration
  });

  it('is deterministic — identical documents encode to byte-identical text', () => {
    const a = encodeVf(sampleScene().toJSON(), { id: 'doc-1', title: 'X' });
    const b = encodeVf(sampleScene().toJSON(), { id: 'doc-1', title: 'X' });
    expect(a).toBe(b);
  });

  it('wraps the scene in the reserved §11.2 envelope (one implicit page)', () => {
    const parsed = JSON.parse(encodeVf(sampleScene().toJSON()));
    expect(parsed.version).toBe(CURRENT_VF_VERSION);
    expect(parsed.pages).toHaveLength(1);
    expect(parsed.pages[0].id).toBe('page-1');
    // reserved sections present (forward compatibility)
    expect(parsed).toMatchObject({ styles: {}, components: [], comments: [], versions: [] });
  });

  it('throws on malformed JSON and on a structurally-invalid envelope', () => {
    expect(() => decodeVf('{not json')).toThrow(/Invalid \.vf/);
    expect(() => decodeVf({ version: '1.0' })).toThrow(/document/);
    expect(() => decodeVf({ version: '1.0', document: { id: 'd' }, pages: 'nope' })).toThrow(
      /pages/,
    );
  });

  it('opens a NEWER-versioned file read-only without dropping data (§11.4)', () => {
    const file = JSON.parse(encodeVf(sampleScene().toJSON()));
    file.version = '99.0';
    file.futureField = { keep: true }; // a field this app does not understand
    const decoded = decodeVf(JSON.stringify(file));
    expect(decoded.readOnly).toBe(true);
    // still loads the scene it can read
    expect(SceneGraph.fromJSON(decoded.scene).has('r')).toBe(true);
  });
});

describe('migration framework', () => {
  it('parses and compares versions', () => {
    expect(parseVersion('1.2')).toEqual({ major: 1, minor: 2 });
    expect(parseVersion('garbage')).toBeNull();
    expect(compareVersions({ major: 1, minor: 0 }, { major: 1, minor: 1 })).toBe(-1);
    expect(compareVersions({ major: 2, minor: 0 }, { major: 1, minor: 9 })).toBe(1);
  });

  it('applies a sequential migration chain up to the target', () => {
    const migrations: Migration[] = [
      { from: '1.0', to: '1.1', migrate: (f) => ({ ...f, a: 1 }) },
      { from: '1.1', to: '1.2', migrate: (f) => ({ ...f, b: 2 }) },
    ];
    const result = applyMigrations({ version: '1.0' }, '1.0', '1.2', migrations);
    expect(result.readOnly).toBe(false);
    expect(result.version).toBe('1.2');
    expect(result.file).toMatchObject({ a: 1, b: 2 });
    expect(result.file.version).toBe('1.2'); // version stamped onto the migrated envelope

    // migrations are pure — the original input object is not mutated
    const input = { version: '1.0' };
    applyMigrations(input, '1.0', '1.2', migrations);
    expect(input).toEqual({ version: '1.0' });
  });

  it('flags read-only when the chain cannot reach the target', () => {
    const migrations: Migration[] = [{ from: '1.0', to: '1.1', migrate: (f) => f }];
    const result = applyMigrations({ version: '1.0' }, '1.0', '1.2', migrations);
    expect(result.version).toBe('1.1');
    expect(result.readOnly).toBe(true);
  });

  it('treats an unparseable version as read-only', () => {
    expect(applyMigrations({}, 'not-a-version').readOnly).toBe(true);
  });
});
