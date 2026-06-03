const allowedInlineTags = /<\/?(?:b|strong|i|em|u|a|br)\b[^>]*>/gi;

export function sanitizeRichText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<\s*\/?\s*(div|p)\b[^>]*>/gi, "<br>")
    .replace(/<br\s*\/?>/gi, "<br>")
    .replace(/<(strong|b)\b[^>]*>/gi, "<strong>")
    .replace(/<\/(strong|b)>/gi, "</strong>")
    .replace(/<(em|i)\b[^>]*>/gi, "<em>")
    .replace(/<\/(em|i)>/gi, "</em>")
    .replace(/<u\b[^>]*>/gi, "<u>")
    .replace(/<\/u>/gi, "</u>")
    .replace(
      /<a\b[^>]*href=(["'])(https?:\/\/[^"']+)\1[^>]*>/gi,
      '<a href="$2" rel="noreferrer" target="_blank">',
    )
    .replace(/<\/a>/gi, "</a>")
    .replace(/<(?!\/?(?:strong|em|u|a|br)\b)[^>]*>/gi, "")
    .replace(/(<br>\s*){3,}/gi, "<br><br>")
    .trim();
}

export function richTextToPlainText(value: unknown) {
  return sanitizeRichText(value)
    .replace(/<br>/gi, "\n")
    .replace(allowedInlineTags, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
