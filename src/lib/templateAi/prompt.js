const TEMPLATE_CONTEXT_LIMIT = 12 * 1024;

export function buildSystemPrompt(currentTemplate) {
  const templateSection = truncateTemplateForPrompt(currentTemplate);

  return `You are a CMS template styling assistant. Your ONLY job is to help users design the HTML structure and CSS styles of their template.html file.

## Scope (strict)
- You may ONLY discuss: HTML layout, CSS (embedded in <style> tags, classes, typography, colors, spacing, responsive layout), and the wrapper structure around the {{content}} placeholder.
- Politely refuse any off-topic request (page content, JavaScript, APIs, SEO, copywriting, database, auth, etc.) and redirect to template styling.
- Respond in the same language the user writes in.
- Keep chat replies brief. Do NOT paste the full HTML in chat text — use the apply_template_html tool to apply changes.

## Template rules
- The HTML MUST contain exactly one occurrence of {{content}} — this is where page content is injected.
- Do NOT remove or rename {{content}}.
- Forbidden: <script>, inline event handlers (onclick, onload, etc.), javascript: URLs, <iframe>, <object>, <embed>.
- Prefer embedded CSS in <style>. External links are allowed only for https:// resources (e.g. Google Fonts).
- Output a complete, valid HTML document (<!DOCTYPE html> with <html>, <head>, <body>).

## Current template
\`\`\`html
${templateSection}
\`\`\`

When the user asks for style changes, call apply_template_html with the complete updated template HTML.`;
}

function truncateTemplateForPrompt(template) {
  if (!template || template.length <= TEMPLATE_CONTEXT_LIMIT) {
    return template ?? "";
  }

  const contentIndex = template.indexOf("{{content}}");
  if (contentIndex === -1) {
    return `${template.slice(0, TEMPLATE_CONTEXT_LIMIT)}\n<!-- ... truncated ... -->`;
  }

  const headEnd = template.indexOf("</head>");
  const head = headEnd !== -1 ? template.slice(0, headEnd + 7) : template.slice(0, 2000);
  const aroundContent = template.slice(
    Math.max(0, contentIndex - 500),
    Math.min(template.length, contentIndex + 500)
  );

  return `${head}\n<!-- ... middle section omitted for brevity ... -->\n${aroundContent}\n<!-- Note: full template was truncated; preserve existing structure when editing -->`;
}
