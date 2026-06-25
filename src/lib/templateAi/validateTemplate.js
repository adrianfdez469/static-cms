import { MAX_FILE_SIZE } from "@/lib/cmsConstants";

const CONTENT_PLACEHOLDER = "{{content}}";

const DANGEROUS_PATTERNS = [
  /<script\b/i,
  /\bon\w+\s*=/i,
  /javascript\s*:/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
];

export function validateTemplate(html) {
  if (typeof html !== "string" || !html.trim()) {
    return { ok: false, error: "Template HTML is empty." };
  }

  if (html.length > MAX_FILE_SIZE) {
    return { ok: false, error: `Template exceeds maximum size of ${MAX_FILE_SIZE} bytes.` };
  }

  const placeholderCount = countOccurrences(html, CONTENT_PLACEHOLDER);
  if (placeholderCount === 0) {
    return { ok: false, error: "Template must contain exactly one {{content}} placeholder." };
  }
  if (placeholderCount > 1) {
    return { ok: false, error: "Template must contain exactly one {{content}} placeholder, not multiple." };
  }

  if (!/<!DOCTYPE\s+html/i.test(html) && !/<html\b/i.test(html)) {
    return { ok: false, error: "Template must be a valid HTML document with <!DOCTYPE html> or <html>." };
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(html)) {
      return { ok: false, error: "Template contains forbidden elements or attributes (scripts, inline handlers, or embedded objects)." };
    }
  }

  const httpLinks = html.match(/(?:href|src)\s*=\s*["']http:\/\//gi);
  if (httpLinks?.length) {
    return { ok: false, error: "External links must use https:// only." };
  }

  return { ok: true, html };
}

function countOccurrences(text, substring) {
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(substring, index)) !== -1) {
    count += 1;
    index += substring.length;
  }
  return count;
}
