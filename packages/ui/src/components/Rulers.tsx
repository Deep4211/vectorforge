import { useEditorSelector } from '../hooks/use-editor-selector';

const SIZE = 26; // ruler thickness (px), matches the mock corner box

function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}

/** Top + left rulers and the corner box (DesignOS). Pure presentational overlay. */
export function Rulers() {
  const viewport = useEditorSelector((s) => s.viewport);
  const major = Math.max(20, 100 * viewport.zoom);
  const minor = Math.max(8, 10 * viewport.zoom);
  const offX = mod(viewport.panX, major);
  const offY = mod(viewport.panY, major);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      {/* corner */}
      <div className="border-border-strong bg-panel absolute left-0 top-0 h-[26px] w-[26px] border-b border-r" />
      {/* top ruler */}
      <div
        className="border-border-strong bg-panel absolute right-0 top-0 h-[26px] overflow-hidden border-b"
        style={{ left: SIZE }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg,#33333E 0,#33333E 1px,transparent 1px,transparent ${minor}px),repeating-linear-gradient(90deg,#45454F 0,#45454F 1px,transparent 1px,transparent ${major}px)`,
            backgroundPosition: `${offX}px 14px`,
            backgroundSize: 'auto 12px,auto 26px',
          }}
        />
      </div>
      {/* left ruler */}
      <div
        className="border-border-strong bg-panel absolute bottom-0 left-0 w-[26px] overflow-hidden border-r"
        style={{ top: SIZE }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg,#33333E 0,#33333E 1px,transparent 1px,transparent ${minor}px),repeating-linear-gradient(0deg,#45454F 0,#45454F 1px,transparent 1px,transparent ${major}px)`,
            backgroundPosition: `14px ${offY}px`,
            backgroundSize: '12px auto,26px auto',
          }}
        />
      </div>
    </div>
  );
}
