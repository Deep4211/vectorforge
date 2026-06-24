import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import type { EditorController, EditorStore } from '@vectorforge/editor';
import type { CanvasEngine } from './engine';

const EngineContext = createContext<CanvasEngine | null>(null);

export interface EditorProviderProps {
  readonly engine: CanvasEngine;
  readonly children: ReactNode;
}

/** Provide the running editor engine to the chrome. Created at the composition root (UI-5). */
export function EditorProvider({ engine, children }: EditorProviderProps): ReactElement {
  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}

export function useEngine(): CanvasEngine {
  const engine = useContext(EngineContext);
  if (engine === null) throw new Error('useEngine must be used within an <EditorProvider>');
  return engine;
}

/** The use-case entry point — components dispatch intentions through it (UI-2). */
export function useController(): EditorController {
  return useEngine().controller;
}

export function useStore(): EditorStore {
  return useEngine().store;
}
