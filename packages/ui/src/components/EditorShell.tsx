import { useEffect, useState } from 'react';
import { useController } from '../context';
import { useGlobalKeyboard } from '../hooks/use-keyboard';
import { Toolbar } from './Toolbar';
import { LayersPanel } from './LayersPanel';
import { CanvasStage } from './CanvasStage';
import { Inspector } from './Inspector';
import { ZoomControls } from './ZoomControls';
import { CommandPalette } from './CommandPalette';

/** The full editor chrome: toolbar, left layers, engine-owned canvas, right inspector. */
export function EditorShell() {
  const controller = useController();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useGlobalKeyboard(controller, !paletteOpen);

  // Cmd/Ctrl+K opens the command palette; closing is handled inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0B0B0E] text-[#ECECF1]">
      {/* The chrome is inert while the modal palette is open (UI-6). */}
      <div className="flex min-h-0 flex-1 flex-col" inert={paletteOpen ? true : undefined}>
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <aside
            aria-label="Left panel"
            className="w-60 shrink-0 overflow-auto border-r border-[#1E1E27] bg-[#101015]"
          >
            <LayersPanel />
          </aside>
          <main className="relative flex min-w-0 flex-1 flex-col">
            <CanvasStage />
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="pointer-events-auto">
                <ZoomControls />
              </div>
            </div>
          </main>
          <div className="shrink-0 border-l border-[#1E1E27]">
            <Inspector />
          </div>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
