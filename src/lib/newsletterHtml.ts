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
  "span",
  "a",
  "img",
]);

const allowedAttributes: Record<string, Set<string>> = {
  p: new Set(["style"]),
  h2: new Set(["style"]),
  h3: new Set(["style"]),
  ul: new Set(["style"]),
  ol: new Set(["style"]),
  li: new Set(["style"]),
  span: new Set(["style"]),
  a: new Set(["href", "target", "rel", "style"]),
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

const allowedStyleProperties = new Set([
  "max-width",
  "width",
  "height",
  "border-radius",
  "display",
  "margin",
  "padding",
  "color",
  "font-size",
  "font-weight",
  "line-height",
  "text-decoration",
]);

const spanStyleProperties = new Set(["font-size", "line-height", "font-weight", "color"]);

function sanitizeStyle(value: string, tagName?: string) {
  const safeProperties = tagName === "span" ? spanStyleProperties : allowedStyleProperties;
  const safeDeclarations: string[] = [];

  for (const declaration of value.split(";")) {
    const [rawProperty, ...rawValueParts] = declaration.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const propertyValue = rawValueParts.join(":").trim();

    if (!property || !propertyValue || !safeProperties.has(property)) {
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
      const safeStyle = sanitizeStyle(attributeValue, tagName);

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

const emailTagStyles: Partial<Record<string, string>> = {
  p: "margin:0 0 18px;font-size:16px;line-height:1.7;color:#111827;",
  h2: "margin:30px 0 14px;font-size:24px;line-height:1.25;font-weight:800;color:#0b1220;",
  h3: "margin:24px 0 12px;font-size:20px;line-height:1.3;font-weight:800;color:#0b1220;",
  ul: "margin:0 0 20px;padding:0 0 0 22px;",
  ol: "margin:0 0 20px;padding:0 0 0 22px;",
  li: "margin:0 0 10px;font-size:16px;line-height:1.7;color:#111827;",
  a: "color:#1157d8;font-weight:700;text-decoration:underline;",
  img: "max-width:100%;width:100%;height:auto;border-radius:16px;display:block;margin:24px auto;",
};

function readAttributeValue(rawTag: string, attributeName: string) {
  const attributePattern = new RegExp(
    `\\s${attributeName}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s"'=<>\\x60]+)`,
    "i",
  );
  const match = rawTag.match(attributePattern);
  const rawValue = match?.[1] || "";

  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function removeAttribute(rawTag: string, attributeName: string) {
  const attributePattern = new RegExp(
    `\\s${attributeName}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s"'=<>\\x60]+)`,
    "i",
  );

  return rawTag.replace(attributePattern, "");
}

function applyEmailStyleToTag(rawTag: string) {
  const tagMatch = rawTag.match(/^<\s*([a-zA-Z0-9]+)/);
  const tagName = tagMatch?.[1]?.toLowerCase() || "";
  const emailStyle = emailTagStyles[tagName];

  if (!emailStyle) {
    return rawTag;
  }

  const existingStyle = readAttributeValue(rawTag, "style");
  const safeStyle = sanitizeStyle(`${decodeHtmlAttribute(existingStyle)};${emailStyle}`);
  let nextTag = removeAttribute(rawTag, "style");

  if (tagName === "img") {
    nextTag = removeAttribute(removeAttribute(nextTag, "width"), "height");
  }

  const isSelfClosing = /\/\s*>$/.test(nextTag);
  const close = isSelfClosing ? " />" : ">";
  const withoutClose = nextTag.replace(/\s*\/?\s*>$/, "");
  const responsiveWidth = tagName === "img" ? ` width="100%"` : "";

  return `${withoutClose} style="${escapeHtml(safeStyle)}"${responsiveWidth}${close}`;
}

export function formatNewsletterBodyHtmlForEmail(value: string) {
  return normalizeNewsletterBodyHtml(value).replace(/<([a-zA-Z0-9]+)(\s[^>]*)?>/g, (tag) =>
    applyEmailStyleToTag(tag),
  );
}

export function buildNewsletterEmailHtml(payload: {
  title: string;
  previewText: string;
  bodyHtml: string;
  noticeHtml?: string;
  footerHtml?: string;
  trackingPixelHtml?: string;
}) {
  const previewText = payload.previewText.trim();
  const escapedPreview = escapeHtml(previewText);
  const escapedTitle = escapeHtml(payload.title.trim() || "Elite Pocket PT Newsletter");
  const noticeHtml = payload.noticeHtml || "";
  const footerHtml = payload.footerHtml || "";
  const trackingPixelHtml = payload.trackingPixelHtml || "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <style>
      body, table, td, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
      img { border:0; outline:none; text-decoration:none; max-width:100%; height:auto; display:block; }
      a { color:#1157d8; }
      @media screen and (max-width: 680px) {
        .email-outer { padding:16px 0 !important; }
        .email-container { width:100% !important; max-width:100% !important; border-left:0 !important; border-right:0 !important; border-radius:0 !important; }
        .email-header { padding:24px 20px !important; }
        .email-content { padding:24px 20px !important; }
        .email-title { font-size:25px !important; line-height:1.25 !important; }
        .email-preview { font-size:16px !important; line-height:1.6 !important; }
        .email-body, .email-body p, .email-body li { font-size:17px !important; line-height:1.65 !important; }
        .email-body h2 { font-size:25px !important; line-height:1.25 !important; margin:30px 0 14px !important; }
        .email-body h3 { font-size:21px !important; line-height:1.3 !important; margin:24px 0 12px !important; }
        .email-body ul, .email-body ol { padding-left:22px !important; }
        .email-body img { width:100% !important; max-width:100% !important; height:auto !important; }
      }
    </style>
  </head>
  <body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0b1220;width:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
      ${escapedPreview}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f5f7fb;">
      <tr>
        <td class="email-outer" align="center" style="padding:32px 16px;">
          <table class="email-container" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">
            <tr>
              <td class="email-header" style="background:#0b1220;padding:28px 32px;color:#ffffff;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#93c5fd;">Elite Pocket PT</p>
                <h1 class="email-title" style="margin:0;font-size:26px;line-height:1.25;font-weight:800;color:#ffffff;">${escapedTitle}</h1>
              </td>
            </tr>
            <tr>
              <td class="email-content" style="padding:30px 32px;">
                ${
                  previewText
                    ? `<p class="email-preview" style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b5563;">${escapedPreview}</p>`
                    : ""
                }
                ${noticeHtml}
                <div class="email-body" style="margin:0;font-size:16px;line-height:1.7;color:#111827;">
                  ${payload.bodyHtml}
                </div>
                ${trackingPixelHtml}
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildResponsiveImageHtml(src: string, alt: string) {
  return `<p><img src="${escapeHtml(src)}" alt="${escapeHtml(
    alt,
  )}" width="100%" style="max-width:100%;width:100%;height:auto;border-radius:16px;display:block;margin:0 auto;" /></p>`;
}

export function buildVideoLinkHtml(videoUrl: string, thumbnailUrl: string, title: string) {
  const safeTitle = title.trim() || "Watch the video";
  const escapedVideoUrl = escapeHtml(videoUrl);

  return `<p><a href="${escapedVideoUrl}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(
    thumbnailUrl,
  )}" alt="${escapeHtml(
    safeTitle,
  )}" width="100%" style="max-width:100%;width:100%;height:auto;border-radius:16px;display:block;margin:0 auto;" /></a></p><p><strong>${escapeHtml(
    safeTitle,
  )}</strong><br /><a href="${escapedVideoUrl}" target="_blank" rel="noopener noreferrer">Watch video</a></p>`;
}
