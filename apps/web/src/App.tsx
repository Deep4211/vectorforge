import { useMemo } from 'react';
import { EditorProvider, EditorShell } from '@vectorforge/ui';
import { createEngine } from './engine/create-engine';

/**
 * The VectorForge editor shell. The composition root creates the engine once
 * (renderer backend + frame loop + editor) and provides it to the React chrome;
 * all rendering is engine-owned (UI-4/UI-5).
 */
export function App() {
  const engine = useMemo(() => createEngine(), []);
  return (
    <EditorProvider engine={engine}>
      <EditorShell />
    </EditorProvider>
  );
}
