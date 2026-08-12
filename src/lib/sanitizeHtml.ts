import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "hr",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "u",
  "code",
  "span",
  "mark",
  "sub",
  "sup",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "colgroup",
  "col",
  "iframe",
];

const ALLOWED_ATTR = [
  "style",
  "class",
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "loading",
  "decoding",
  "colspan",
  "rowspan",
  "scope",
  "colwidth",
  "data-youtube-video",
  "allowfullscreen",
  "frameborder",
  "allow",
  "autoplay",
  "disablekbcontrols",
  "enableiframeapi",
  "endtime",
  "ivloadpolicy",
  "loop",
  "modestbranding",
  "origin",
  "playlist",
  "start",
];

const ALLOWED_IFRAME_HOSTS = new Set(["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtu.be"]);

const ALLOWED_STYLE_PROPS = new Set(["text-align", "color", "background-color", "min-width", "width"]);

const SAFE_URI_REGEXP = /^(?:(?:(?:https?|mailto|tel):|data:image\/)|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

let iframeHookRegistered = false;

function registerIframeHostHook(): void {
  if (iframeHookRegistered) return;
  iframeHookRegistered = true;

  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName !== "iframe") return;

    const element = node as unknown as HTMLIFrameElement;
    const src = element.getAttribute("src") ?? "";

    let isAllowedHost = false;
    try {
      const url = new URL(src, window.location.href);
      isAllowedHost = ALLOWED_IFRAME_HOSTS.has(url.hostname);
    } catch {
      isAllowedHost = false;
    }

    if (!isAllowedHost) {
      element.remove();
    }
  });
}

function filterStyleValue(styleValue: string): string {
  const declarations: string[] = [];

  for (const decl of styleValue.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx < 0) continue;

    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;

    const lowerValue = value.toLowerCase();
    if (lowerValue.includes("expression(") || lowerValue.includes("javascript:") || lowerValue.includes("url(")) {
      continue;
    }

    declarations.push(`${prop}: ${value}`);
  }

  return declarations.join("; ");
}

let styleAttrHookRegistered = false;

function registerStyleAttributeHook(): void {
  if (styleAttrHookRegistered) return;
  styleAttrHookRegistered = true;

  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName !== "style") return;

    const filtered = filterStyleValue(data.attrValue);
    if (!filtered) {
      data.keepAttr = false;
      return;
    }

    data.attrValue = filtered;
  });
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";

  registerIframeHostHook();
  registerStyleAttributeHook();

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
