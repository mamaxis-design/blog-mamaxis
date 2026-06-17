const MICROCMS_IMAGE_HOSTS = ['images.microcms-assets.io', 'images.microcms.io'];

export interface ImageOptimizeOptions {
  w?: number;
  h?: number;
  q?: number;
  fm?: 'webp' | 'jpg' | 'png';
}

/** 表示用途ごとの推奨サイズ */
export const imageSizes = {
  card: { w: 800, q: 80 },
  cardSmall: { w: 600, q: 80 },
  hero: { w: 1600, q: 85 },
  thumb: { w: 200, q: 75 },
  article: { w: 1440, q: 80 },
} as const satisfies Record<string, ImageOptimizeOptions>;

export function isMicroCmsImageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return MICROCMS_IMAGE_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function defaultFormat(url: string): ImageOptimizeOptions['fm'] {
  if (/\.(svg|gif)(\?|$)/i.test(url)) return undefined;
  return 'webp';
}

/** microCMS CDN 向けにリサイズ・圧縮パラメータを付与 */
export function optimizeMicroCmsImageUrl(
  url: string,
  options: ImageOptimizeOptions = {},
): string {
  if (!url || !isMicroCmsImageUrl(url)) return url;

  try {
    const parsed = new URL(url);
    const { w, h, q = 80, fm = defaultFormat(url) } = options;

    if (w) parsed.searchParams.set('w', String(w));
    if (h) parsed.searchParams.set('h', String(h));
    parsed.searchParams.set('q', String(q));
    if (fm) parsed.searchParams.set('fm', fm);

    return parsed.toString();
  } catch {
    return url;
  }
}

/** リッチエディタ HTML 内の microCMS 画像 URL を最適化 */
export function optimizeMicroCmsHtml(html: string): string {
  if (!html) return html;

  return html.replace(/<img\b([^>]*?)>/gi, (tag, attrs: string) => {
    const srcMatch = attrs.match(/\bsrc="([^"]+)"/i);
    if (!srcMatch) return tag;

    const src = srcMatch[1];
    if (!isMicroCmsImageUrl(src)) return tag;

    const optimizedSrc = optimizeMicroCmsImageUrl(src, imageSizes.article);
    let nextAttrs = attrs.replace(srcMatch[0], `src="${optimizedSrc}"`);

    if (!/\bloading=/i.test(nextAttrs)) {
      nextAttrs = ` loading="lazy"${nextAttrs}`;
    }
    if (!/\bdecoding=/i.test(nextAttrs)) {
      nextAttrs = ` decoding="async"${nextAttrs}`;
    }

    return `<img${nextAttrs}>`;
  });
}
