import { useEffect, useMemo, type ReactNode } from 'react';
import { SceneGraph } from '@vectorforge/document';
import { sceneToSvg } from '@vectorforge/renderer';
import { Autosave, decodeVf, encodeVf, type DocumentRepository } from '@vectorforge/persistence';
import { WorkspaceProvider, type CanvasEngine, type WorkspaceService } from '@vectorforge/ui';
import { downloadBlob, downloadText, pickTextFile } from './file-io';
import { exportScene, renderDocumentPng } from './export-image';

const AUTOSAVE_MS = 800;

/**
 * Wires document I/O for the authenticated editor: debounced autosave to the
 * repository, recovery of the last autosaved document on mount, and the
 * {@link WorkspaceService} (download/open `.vf`, export PNG/SVG, new document)
 * the chrome consumes. The actual `.vf` codec (persistence) and SVG/PNG
 * serialization (renderer) live here at the composition root, never in `ui`.
 */
export function WorkspaceHost({
  engine,
  repository,
  docId,
  children,
}: {
  engine: CanvasEngine;
  repository: DocumentRepository;
  docId: string;
  children: ReactNode;
}) {
  const autosave = useMemo(
    () =>
      new Autosave(
        repository,
        () => ({ id: docId, name: 'Untitled', vf: encodeVf(engine.controller.toDocument()) }),
        { delayMs: AUTOSAVE_MS, onSaved: () => engine.controller.markSaved() },
      ),
    [engine, repository, docId],
  );

  // Recovery: restore this user's last autosaved document on mount.
  useEffect(() => {
    let cancelled = false;
    void repository.load(docId).then((vf) => {
      if (cancelled || !vf) return;
      try {
        engine.controller.loadDocument(decodeVf(vf).scene);
      } catch {
        /* corrupt autosave — keep the starter document rather than failing to load */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [engine, repository, docId]);

  // Autosave on every committed change, but only when there are unsaved edits.
  useEffect(() => {
    const unsubscribe = engine.store.subscribe(
      (s) => s.documentVersion,
      () => {
        if (engine.store.getState().dirty) autosave.schedule();
      },
    );
    return () => {
      unsubscribe();
      // Persist any pending edit before tearing down (logout / account switch),
      // then stop. flush() saves the current snapshot to the closure's docId.
      void autosave.flush().finally(() => autosave.dispose());
    };
  }, [engine, autosave]);

  const service = useMemo<WorkspaceService>(
    () => ({
      newDocument() {
        engine.controller.loadDocument(SceneGraph.empty().toJSON());
      },
      async downloadVf() {
        downloadText(
          'untitled.vf',
          encodeVf(engine.controller.toDocument()),
          'application/octet-stream',
        );
        await autosave.flush();
      },
      async openVf() {
        const text = await pickTextFile('.vf,application/json');
        if (text == null) return;
        try {
          const decoded = decodeVf(text);
          engine.controller.loadDocument(decoded.scene);
          // Never write a newer/unmigratable file back under our schema (§11.4):
          // load it for viewing but do not autosave-overwrite it.
          if (decoded.readOnly) {
            globalThis.alert(
              'This file was created by a newer version of VectorForge. It is open as read-only and will not be saved over.',
            );
          } else {
            autosave.schedule();
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'not a valid .vf file';
          globalThis.alert(`Could not open file: ${message}`);
        }
      },
      exportSvg() {
        downloadText('untitled.svg', sceneToSvg(exportScene(engine)), 'image/svg+xml');
      },
      async exportPng(scale = 2) {
        const blob = await renderDocumentPng(engine, scale);
        if (blob) downloadBlob('untitled.png', blob);
      },
    }),
    [engine, autosave],
  );

  return <WorkspaceProvider service={service}>{children}</WorkspaceProvider>;
}
