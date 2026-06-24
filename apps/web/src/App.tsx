import { useEffect, useMemo } from 'react';
import {
  AuthScreen,
  canvasGridColor,
  EditorProvider,
  EditorShell,
  initAuth,
  restoreSession,
  useAuth,
  useTheme,
} from '@vectorforge/ui';
import { createEngine } from './engine/create-engine';
import { createDefaultServices, type AppServices } from './services';
import { WorkspaceHost } from './workspace/WorkspaceHost';

/** A minimal centered loader shown while the persisted session is restored. */
function Splash() {
  return (
    <div className="bg-canvas text-faint flex h-screen w-screen items-center justify-center text-sm">
      Loading…
    </div>
  );
}

/**
 * The VectorForge composition root. Restores the session, gates the editor
 * behind authentication, and wires the renderer + document I/O ports. Services
 * (auth provider + repository) are injectable for tests; production uses the
 * local Web Crypto + IndexedDB adapters.
 */
export function App({ services }: { services?: AppServices } = {}) {
  const resolvedServices = useMemo(() => services ?? createDefaultServices(), [services]);
  const engine = useMemo(() => createEngine(), []);
  const theme = useTheme();
  const { status, user } = useAuth();

  useEffect(() => {
    initAuth(resolvedServices.authProvider);
    void restoreSession();
  }, [resolvedServices]);

  useEffect(() => {
    engine.setGridColor(canvasGridColor(theme));
  }, [engine, theme]);

  if (status === 'initializing') return <Splash />;
  if (status === 'unauthenticated' || !user) return <AuthScreen />;

  // Scope autosave/recovery storage per account so accounts never share a
  // document on a shared device. `user` is guaranteed non-null past the gate.
  const docId = `vf:doc:${user.id}`;
  return (
    <EditorProvider engine={engine}>
      <WorkspaceHost engine={engine} repository={resolvedServices.repository} docId={docId}>
        <EditorShell />
      </WorkspaceHost>
    </EditorProvider>
  );
}
