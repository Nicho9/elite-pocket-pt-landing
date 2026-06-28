const allowedTags = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "img",
]);

const allowedAttributes: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "style"]),
};

const voidTags = new Set(["br", "img"]);
const appleFounder20Url =
  "https://apps.apple.com/redeem?ctx=offercodes&id=6761879840&code=FOUNDER20";
const appStoreUrl = "https://apps.apple.com/ae/app/elite-pocket-pt/id6761879840";
const googlePlayUrl = "https://play.google.com/store/apps/details?id=com.elitepocketpt.app";

export const newsletterTrackedLinks = {
  appStoreUrl,
  googlePlayUrl,
  appleFounder20Url,
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function isSafeUrl(value: string) {
  const trimmed = decodeHtmlAttribute(value).trim();

  if (!trimmed) {
    return false;
  }

  if (/^(https?:|mailto:)/i.test(trimmed)) {
    return true;
  }

  return trimmed.startsWith("/");
}

function sanitizeStyle(value: string) {
  const allowedProperties = new Set([
    "max-width",
    "width",
    "height",
    "border-radius",
    "display",
    "margin",
  ]);
  const safeDeclarations: string[] = [];

  for (const declaration of value.split(";")) {
    const [rawProperty, ...rawValueParts] = declaration.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const propertyValue = rawValueParts.join(":").trim();

    if (!property || !propertyValue || !allowedProperties.has(property)) {
      continue;
    }

    if (
      /url\s*\(|expression\s*\(|javascript:/i.test(propertyValue) ||
      !/^[#%(),.\-\s\w]+$/.test(propertyValue)
    ) {
      continue;
    }

    safeDeclarations.push(`${property}:${propertyValue}`);
  }

  return safeDeclarations.join(";");
}

function sanitizeAttributes(tagName: string, rawAttributes: string) {
  const allowedForTag = allowedAttributes[tagName];

  if (!allowedForTag) {
    return "";
  }

  const attributes: string[] = [];
  const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(rawAttributes))) {
    const attributeName = match[1].toLowerCase();
    const attributeValue = match[3] ?? match[4] ?? match[5] ?? "";

    if (!allowedForTag.has(attributeName) || attributeName.startsWith("on")) {
      continue;
    }

    if ((attributeName === "href" || attributeName === "src") && !isSafeUrl(attributeValue)) {
      continue;
    }

    if (attributeName === "style") {
      const safeStyle = sanitizeStyle(attributeValue);

      if (safeStyle) {
        attributes.push(`style="${escapeHtml(safeStyle)}"`);
      }
      continue;
    }

    if (attributeName === "target") {
      attributes.push(`target="_blank"`);
      continue;
    }

    if (attributeName === "rel") {
      attributes.push(`rel="noopener noreferrer"`);
      continue;
    }

    attributes.push(`${attributeName}="${escapeHtml(decodeHtmlAttribute(attributeValue).trim())}"`);
  }

  if (tagName === "a") {
    const hasTarget = attributes.some((attribute) => attribute.startsWith("target="));
    const hasRel = attributes.some((attribute) => attribute.startsWith("rel="));

    if (attributes.some((attribute) => attribute.startsWith("href="))) {
      if (!hasTarget) {
        attributes.push(`target="_blank"`);
      }

      if (!hasRel) {
        attributes.push(`rel="noopener noreferrer"`);
      }
    }
  }

  return attributes.length ? ` ${attributes.join(" ")}` : "";
}

function sanitizeTag(rawTag: string) {
  const tagMatch = rawTag.match(/^<\/?\s*([a-zA-Z0-9]+)([^>]*)>$/);

  if (!tagMatch) {
    return "";
  }

  const tagName = tagMatch[1].toLowerCase();
  const isClosingTag = /^<\//.test(rawTag);

  if (!allowedTags.has(tagName)) {
    return "";
  }

  if (isClosingTag) {
    return voidTags.has(tagName) ? "" : `</${tagName}>`;
  }

  const attributes = sanitizeAttributes(tagName, tagMatch[2] || "");

  if (tagName === "img") {
    return attributes.includes("src=") ? `<img${attributes} />` : "";
  }

  return `<${tagName}${attributes}>`;
}

export function sanitizeNewsletterHtml(value: string) {
  const withoutUnsafeBlocks = value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "");

  return withoutUnsafeBlocks.replace(/<\/?[^>]+>/g, (tag) => sanitizeTag(tag));
}

export function normalizeNewsletterBodyHtml(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return sanitizeNewsletterHtml(trimmed);
  }

  return sanitizeNewsletterHtml(
    trimmed
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
      .join(""),
  );
}

export function buildResponsiveImageHtml(src: string, alt: string) {
  return `<p><img src="${escapeHtml(src)}" alt="${escapeHtml(
    alt,
  )}" style="max-width:100%;height:auto;border-radius:16px;display:block;margin:0 auto;" /></p>`;
}

export function buildVideoLinkHtml(videoUrl: string, thumbnailUrl: string, title: string) {
  const safeTitle = title.trim() || "Watch the video";
  const escapedVideoUrl = escapeHtml(videoUrl);

  return `<p><a href="${escapedVideoUrl}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(
    thumbnailUrl,
  )}" alt="${escapeHtml(
    safeTitle,
  )}" style="max-width:100%;height:auto;border-radius:16px;display:block;margin:0 auto;" /></a></p><p><strong>${escapeHtml(
    safeTitle,
  )}</strong><br /><a href="${escapedVideoUrl}" target="_blank" rel="noopener noreferrer">Watch video</a></p>`;
}
