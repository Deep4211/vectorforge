import { createContext, useContext, type ReactNode } from 'react';

/**
 * The presentation-facing handle to document I/O (save/open/export). Like
 * {@link CanvasEngine}, it is a port the UI consumes and `apps/web` implements at
 * the composition root — the actual `.vf` encoding (persistence) and SVG/PNG
 * serialization (renderer) live there, never imported into this layer.
 */
export interface WorkspaceService {
  /** Reset to a blank document (prompts only if there are unsaved changes — app's call). */
  newDocument(): void;
  /** Download the current document as a `.vf` file. */
  downloadVf(): void | Promise<void>;
  /** Open a `.vf` from the user's disk (file picker) and load it. */
  openVf(): void | Promise<void>;
  /** Export the artwork as a PNG raster at the given scale (default 2×). */
  exportPng(scale?: number): void | Promise<void>;
  /** Export the artwork as an SVG vector file. */
  exportSvg(): void | Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceService | null>(null);

export function WorkspaceProvider({
  service,
  children,
}: {
  service: WorkspaceService;
  children: ReactNode;
}) {
  return <WorkspaceContext.Provider value={service}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceService {
  const service = useContext(WorkspaceContext);
  if (!service) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return service;
}
