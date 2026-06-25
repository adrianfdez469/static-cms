export function renderTemplate(template, contentHtml) {
  return template.replace("{{content}}", contentHtml);
}

export function extractRenderableTemplateParts(html) {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const headHtml = headMatch?.[1] ?? "";

  const styles = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(headHtml)) !== null) {
    styles.push(match[1]);
  }

  const links = [];
  const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi;
  while ((match = linkRegex.exec(headHtml)) !== null) {
    const hrefMatch = match[0].match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      links.push(hrefMatch[1]);
    }
  }

  return {
    styles,
    links,
    bodyHtml: bodyMatch?.[1] ?? html,
  };
}
