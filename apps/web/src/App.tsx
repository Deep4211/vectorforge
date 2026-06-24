import { useEffect, useMemo } from 'react';
import { canvasGridColor, EditorProvider, EditorShell, useTheme } from '@vectorforge/ui';
import { createEngine } from './engine/create-engine';

/**
 * The VectorForge editor shell. The composition root creates the engine once
 * (renderer backend + frame loop + editor) and provides it to the React chrome;
 * all rendering is engine-owned (UI-4/UI-5). The chrome themes itself purely via
 * CSS tokens; only the canvas grid colour must be bridged to the renderer here.
 */
export function App() {
  const engine = useMemo(() => createEngine(), []);
  const theme = useTheme();

  useEffect(() => {
    engine.setGridColor(canvasGridColor(theme));
  }, [engine, theme]);

  return (
    <EditorProvider engine={engine}>
      <EditorShell />
    </EditorProvider>
  );
}
