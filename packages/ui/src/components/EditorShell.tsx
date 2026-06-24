import { useEffect, useState } from 'react';
import { useController } from '../context';
import { useGlobalKeyboard } from '../hooks/use-keyboard';
import { Toolbar } from './Toolbar';
import { LeftPanel } from './LeftPanel';
import { CanvasStage } from './CanvasStage';
import { Rulers } from './Rulers';
import { SelectionOverlay } from './SelectionOverlay';
import { TextEditorOverlay } from './TextEditorOverlay';
import { Inspector } from './Inspector';
import { ZoomControls } from './ZoomControls';
import { Minimap } from './Minimap';
import { BottomDock } from './BottomDock';
import { CommandPalette } from './CommandPalette';

/** The full editor chrome (DesignOS layout). */
export function EditorShell() {
  const controller = useController();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useGlobalKeyboard(controller, !paletteOpen);

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
    <div className="bg-canvas text-ink flex h-screen w-screen flex-col overflow-hidden">
      {/* Chrome is inert while the modal palette is open (UI-6). */}
      <div className="flex min-h-0 flex-1 flex-col" inert={paletteOpen ? true : undefined}>
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <aside
            aria-label="Left panel"
            className="border-border-strong bg-panel w-[264px] flex-none border-r"
          >
            <LeftPanel />
          </aside>
          <main className="bg-canvas relative flex min-w-0 flex-1 overflow-hidden">
            <CanvasStage />
            <Rulers />
            <SelectionOverlay />
            <TextEditorOverlay />
            <div className="absolute bottom-4 left-4 z-30">
              <ZoomControls />
            </div>
            <div className="absolute bottom-4 right-4 z-30">
              <Minimap />
            </div>
          </main>
          <div className="border-border-strong flex-none border-l">
            <Inspector />
          </div>
        </div>
        <BottomDock />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
