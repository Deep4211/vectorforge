import type { RenderItem, RenderScene } from '../types';
import { documentBounds } from './bounds';

/**
 * Vector (SVG) export. Consumes the same {@link RenderScene} the canvas renderer
 * paints (RND-1: read-only over the document) and emits a standalone SVG string.
 * Each item is placed by its world matrix and drawn in node-local coordinates,
 * so transforms (rotation/scale) and effective opacity match the on-canvas
 * result. Groups carry no item (their transform is already folded into children).
 */
export interface SvgExportOptions {
  /** Page background painted behind the artwork; omit/null for transparent. */
  readonly background?: string | null;
  /** Padding (world units) added around the content bounds. Default 0. */
  readonly padding?: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Trim trailing zeros so coordinates stay compact and diffs stay stable. */
function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
}

function matrix(item: RenderItem): string {
  const [a, b, c, d, e, f] = item.worldMatrix.toArray();
  return `matrix(${[a, b, c, d, e, f].map(num).join(' ')})`;
}

function opacityAttr(item: RenderItem): string {
  return item.opacity < 1 ? ` opacity="${num(item.opacity)}"` : '';
}

function itemToSvg(item: RenderItem): string {
  const t = matrix(item);
  const o = opacityAttr(item);
  switch (item.kind) {
    case 'frame':
      return `<rect transform="${t}"${o} x="0" y="0" width="${num(item.size.w)}" height="${num(item.size.h)}" fill="${escapeXml(item.backgroundColor)}" />`;
    case 'rectangle': {
      const r = item.cornerRadius > 0 ? ` rx="${num(item.cornerRadius)}"` : '';
      return `<rect transform="${t}"${o} x="0" y="0" width="${num(item.size.w)}" height="${num(item.size.h)}"${r} fill="${escapeXml(item.fill)}" />`;
    }
    case 'ellipse':
      return `<ellipse transform="${t}"${o} cx="${num(item.size.w / 2)}" cy="${num(item.size.h / 2)}" rx="${num(item.size.w / 2)}" ry="${num(item.size.h / 2)}" fill="${escapeXml(item.fill)}" />`;
    case 'line':
      return `<line transform="${t}"${o} x1="${num(item.a.x)}" y1="${num(item.a.y)}" x2="${num(item.b.x)}" y2="${num(item.b.y)}" stroke="${escapeXml(item.stroke)}" stroke-width="${num(item.strokeWidth)}" stroke-linecap="round" />`;
    case 'text': {
      const boxWidth = item.size?.w ?? 0;
      const anchor =
        item.textAlign === 'center' ? 'middle' : item.textAlign === 'right' ? 'end' : 'start';
      const x =
        item.textAlign === 'center' ? boxWidth / 2 : item.textAlign === 'right' ? boxWidth : 0;
      // y is the baseline; approximate it from the first line's ascent (~font size).
      return `<text transform="${t}"${o} x="${num(x)}" y="${num(item.fontSize)}" font-family="${escapeXml(item.fontFamily)}" font-size="${num(item.fontSize)}" font-weight="${item.fontWeight}" letter-spacing="${num(item.letterSpacing)}" text-anchor="${anchor}" fill="${escapeXml(item.fill)}">${escapeXml(item.content)}</text>`;
    }
    case 'image':
      return `<image transform="${t}"${o} x="0" y="0" width="${num(item.size.w)}" height="${num(item.size.h)}" href="${escapeXml(item.assetRef)}" preserveAspectRatio="${item.fit === 'contain' ? 'xMidYMid meet' : item.fit === 'cover' ? 'xMidYMid slice' : 'none'}" />`;
    default:
      return '';
  }
}

/** Serialize a scene to a standalone SVG document string. */
export function sceneToSvg(scene: RenderScene, options: SvgExportOptions = {}): string {
  const padding = options.padding ?? 0;
  const bounds = documentBounds(scene);
  const minX = (bounds ? bounds.minX : 0) - padding;
  const minY = (bounds ? bounds.minY : 0) - padding;
  const width = (bounds ? bounds.maxX - bounds.minX : 1) + padding * 2;
  const height = (bounds ? bounds.maxY - bounds.minY : 1) + padding * 2;

  const bg =
    options.background != null
      ? `<rect x="${num(minX)}" y="${num(minY)}" width="${num(width)}" height="${num(height)}" fill="${escapeXml(options.background)}" />`
      : '';
  const body = scene.items.map(itemToSvg).filter(Boolean).join('\n  ');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="${num(minX)} ${num(minY)} ${num(width)} ${num(height)}">`,
    bg ? `  ${bg}` : '',
    body ? `  ${body}` : '',
    '</svg>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}
