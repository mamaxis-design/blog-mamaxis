import { imageSizes, optimizeMicroCmsHtml, optimizeMicroCmsImageUrl } from './images';

interface ImageBlock {
  img: string;
  caption: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function appendClassToImg(imgTag: string, className: string): string {
  if (/\bclass="/i.test(imgTag)) {
    return imgTag.replace(/\bclass="([^"]*)"/i, (_, classes: string) => {
      const merged = classes.split(/\s+/).filter(Boolean);
      className.split(/\s+/).forEach((c) => {
        if (!merged.includes(c)) merged.push(c);
      });
      return `class="${merged.join(' ')}"`;
    });
  }
  return imgTag.replace(/<img/i, `<img class="${className}"`);
}

/** microCMS の巨大 width/height 属性が CSS を上書きするため除去 */
function stripImgDimensions(imgTag: string): string {
  return imgTag
    .replace(/\s+width=["']?\d+["']?/i, '')
    .replace(/\s+height=["']?\d+["']?/i, '')
    .replace(/\s+style="[^"]*aspect-ratio:[^"]*"/i, '');
}

function enhanceImgTag(imgTag: string, context: 'single' | 'grid'): string {
  let tag = imgTag;

  const srcMatch = tag.match(/\bsrc="([^"]+)"/i);
  if (srcMatch?.[1]) {
    const optimized = optimizeMicroCmsImageUrl(srcMatch[1], imageSizes.article);
    tag = tag.replace(srcMatch[0], `src="${optimized}"`);
  }

  if (!/\bloading=/i.test(tag)) tag = tag.replace(/<img/i, '<img loading="lazy"');
  if (!/\bdecoding=/i.test(tag)) tag = tag.replace(/<img/i, '<img decoding="async"');

  const classes = [
    'article-img',
    context === 'grid' ? 'article-img--grid' : 'article-img--single',
  ].join(' ');

  tag = appendClassToImg(tag, classes);
  return stripImgDimensions(tag);
}

function parseImageBlock(block: string): ImageBlock | null {
  const tag = block.trim();

  if (/^<figure/i.test(tag)) {
    const imgMatch = tag.match(/<img\b[^>]*\/?>/i);
    if (!imgMatch) return null;
    const capMatch = tag.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
    return {
      img: imgMatch[0],
      caption: capMatch ? stripHtml(capMatch[1]) : '',
    };
  }

  if (/^<p/i.test(tag)) {
    const imgMatch = tag.match(/<img\b[^>]*\/?>/i);
    if (!imgMatch) return null;

    const inner = tag.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '');
    const withoutImg = inner.replace(imgMatch[0], '');

    if (/<(?!br\b|span\b|em\b|strong\b|a\b|\/)[a-z]/i.test(withoutImg.replace(/<br\s*\/?>/gi, ''))) {
      return null;
    }

    return {
      img: imgMatch[0],
      caption: stripHtml(withoutImg),
    };
  }

  return null;
}

function renderCaption(caption: string): string {
  if (!caption) return '';
  return `<figcaption class="article-caption">${escapeHtml(caption)}</figcaption>`;
}

function wrapSingleFigure(block: ImageBlock): string {
  const img = enhanceImgTag(block.img, 'single');
  return `<figure class="article-figure article-figure--single">${img}${renderCaption(block.caption)}</figure>`;
}

function wrapImageGroup(blocks: ImageBlock[]): string {
  const colModifier =
    blocks.length >= 3 ? 'article-image-group--3' : 'article-image-group--2';

  const figures = blocks
    .map((block) => {
      const img = enhanceImgTag(block.img, 'grid');
      return `<figure class="article-figure article-figure--grid">${img}${renderCaption(block.caption)}</figure>`;
    })
    .join('');

  return `<div class="article-image-group ${colModifier}">${figures}</div>`;
}

type HtmlSegment =
  | { kind: 'html'; value: string }
  | { kind: 'block'; value: string };

function splitIntoSegments(html: string): HtmlSegment[] {
  const blockRegex = /<(p|figure)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const segments: HtmlSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'html', value: html.slice(lastIndex, match.index) });
    }
    segments.push({ kind: 'block', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    segments.push({ kind: 'html', value: html.slice(lastIndex) });
  }

  return segments;
}

function processImageBlocks(html: string): string {
  const segments = splitIntoSegments(html);
  const output: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment.kind === 'html') {
      output.push(segment.value);
      continue;
    }

    const parsed = parseImageBlock(segment.value);
    if (!parsed) {
      output.push(segment.value);
      continue;
    }

    const group: ImageBlock[] = [parsed];
    let j = i + 1;

    while (j < segments.length && segments[j].kind === 'block') {
      const next = parseImageBlock(segments[j].value);
      if (!next) break;
      group.push(next);
      j++;
    }

    if (group.length >= 2) {
      output.push(wrapImageGroup(group));
    } else {
      output.push(wrapSingleFigure(group[0]));
    }

    i = j - 1;
  }

  return output.join('');
}

/** 記事本文 HTML を画像レイアウト向けに整形 */
export function formatArticleContent(html: string): string {
  if (!html) return html;
  const optimized = optimizeMicroCmsHtml(html);
  return wrapTables(processImageBlocks(optimized));
}

function wrapTables(html: string): string {
  return html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (table) => {
    if (/class="[^"]*\btable-scroll\b/.test(table)) return table;
    return `<div class="table-scroll">${table}</div>`;
  });
}
