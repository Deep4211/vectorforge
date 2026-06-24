import { PACKAGE_ID as sharedId } from '@vectorforge/shared';
import { PACKAGE_ID as geometryId } from '@vectorforge/geometry';
import { PACKAGE_ID as documentId } from '@vectorforge/document';
import { PACKAGE_ID as commandsId } from '@vectorforge/commands';
import { PACKAGE_ID as editorId } from '@vectorforge/editor';
import { PACKAGE_ID as rendererId } from '@vectorforge/renderer';
import { PACKAGE_ID as persistenceId } from '@vectorforge/persistence';
import { PACKAGE_ID as uiId } from '@vectorforge/ui';

/**
 * Sprint 0 boot screen.
 *
 * Imports the public-API entry of every workspace package, which proves the
 * full dependency graph resolves through Vite at runtime. It is intentionally a
 * pure presentation component — no editor logic lives here (that arrives with
 * the UI integration sprint). It will be replaced by the editor shell in Sprint 7.
 */
const WORKSPACE_PACKAGES = [
  sharedId,
  geometryId,
  documentId,
  commandsId,
  editorId,
  rendererId,
  persistenceId,
  uiId,
] as const;

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0B0B0E] px-6 py-12 text-[#ECECF1]">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">VectorForge</h1>
        <p className="text-sm text-[#9A9AA6]">
          Browser-native collaborative vector &amp; UI design platform
        </p>
        <span className="mt-2 rounded-full bg-[#7C5CFF]/15 px-3 py-1 text-xs font-semibold text-[#8B6BFF]">
          Sprint 0 · foundation ready
        </span>
      </header>

      <section className="w-full max-w-md">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#5C5C6A]">
          Workspace packages
        </h2>
        <ul className="grid grid-cols-1 gap-2">
          {WORKSPACE_PACKAGES.map((id) => (
            <li
              key={id}
              className="flex items-center justify-between rounded-lg border border-[#26262F] bg-[#16161D] px-3 py-2 font-mono text-sm"
            >
              <span>{id}</span>
              <span className="h-2 w-2 rounded-full bg-[#3FCF8E]" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
