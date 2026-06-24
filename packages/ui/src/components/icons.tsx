/** SVG icon paths lifted from the DesignOS.dc.html mock (24×24, stroked). */
export const PATHS = {
  move: 'M5 3l5 16 2.5-6.5L19 10z',
  frame: 'M4 8h16M4 16h16M8 4v16M16 4v16',
  rectangle: 'M4 5h16v14H4z',
  ellipse: 'M3 12a9 7 0 1 0 18 0a9 7 0 1 0 -18 0',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  hand: 'M12 4v16M4 12h16M9 7l3-3 3 3M9 17l3 3 3-3M7 9l-3 3 3 3M17 9l3 3-3 3',
  group: 'M3 8a2 2 0 0 1 2-2h3l2 2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  image: 'M4 5h16v14H4z M4 16l4-4 3 3 4-4 5 5',
  line: 'M4 20L20 4',
  undo: ['M9 14L4 9l5-5', 'M4 9h11a5 5 0 0 1 0 10h-3'],
  redo: ['M15 14l5-5-5-5', 'M20 9H9a5 5 0 0 0 0 10h3'],
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  share: [
    'M18 5a3 3 0 1 0 0 0',
    'M6 12a3 3 0 1 0 0 0',
    'M18 19a3 3 0 1 0 0 0',
    'M8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  ],
  device: ['M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M11 18h2'],
  settings: [
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z',
  ],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  eyeOff: [
    'M3 3l18 18',
    'M10.6 10.6a3 3 0 0 0 4 4',
    'M9.4 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.3',
    'M6.1 6.1A17 17 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 3.9-.8',
  ],
  lock: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 6 0v3'],
  unlock: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 5.8-1'],
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M21 21l-4-4'],
  logo: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M12 12l8-4.5M12 12v9M12 12L4 7.5'],
  command: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M21 21l-4-4'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  ],
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
} as const;

export interface IconProps {
  readonly d: string | readonly string[];
  readonly size?: number;
  readonly sw?: number;
  readonly className?: string;
}

/** A 24×24 stroked icon (currentColor). Decorative — hidden from AT. */
export function Icon({ d, size = 16, sw = 1.6, className }: IconProps) {
  const paths = Array.isArray(d) ? d : [d as string];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
