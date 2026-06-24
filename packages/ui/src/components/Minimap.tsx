/**
 * Minimap shell (DesignOS, bottom-right). A static world overview placeholder;
 * the live viewport rect + content thumbnail land with the spatial index (Sprint 9).
 */
export function Minimap() {
  return (
    <div
      aria-label="Minimap"
      className="h-[104px] w-[150px] overflow-hidden rounded-xl border border-[#2A2A36] bg-[#13131A] p-2.5 shadow-[0_8px_24px_rgba(0,0,0,.4)]"
    >
      <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#4E4E5A]">Map</div>
      <div className="relative mt-1.5 h-full w-full">
        <div className="absolute left-[14%] top-[18%] h-[62%] w-[24%] rounded-sm border border-[#3A3A52] bg-[#26263A]" />
        <div className="absolute left-[54%] top-[18%] h-[62%] w-[24%] rounded-sm border border-[#3A3A52] bg-[#26263A]" />
        <div className="border-brand bg-brand/[0.12] absolute left-[8%] top-[10%] h-[70%] w-[80%] rounded-[2px] border-[1.5px]" />
      </div>
    </div>
  );
}
