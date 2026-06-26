export const BUCKET = "CMS";
export const TEMPLATE_PATH = "template.html";
export const CONTENT_PREFIX = "content";
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CMS</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f8f9fb;
      --surface: #ffffff;
      --text: #1a1d23;
      --muted: #5c6370;
      --border: #e4e7ec;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 1rem;
      line-height: 1.65;
      color: var(--text);
      background: var(--bg);
    }

    main {
      max-width: 42rem;
      margin: 0 auto;
      padding: 3rem 1.5rem 4rem;
      background: var(--surface);
      border-left: 1px solid var(--border);
      border-right: 1px solid var(--border);
      min-height: 100vh;
    }

    h1, h2, h3, h4 {
      line-height: 1.25;
      margin: 2rem 0 0.75rem;
      font-weight: 650;
      letter-spacing: -0.02em;
    }

    h1:first-child,
    h2:first-child,
    h3:first-child {
      margin-top: 0;
    }

    p, ul, ol, blockquote, pre {
      margin: 0 0 1rem;
    }

    a {
      color: var(--accent);
      text-decoration-thickness: 1px;
      text-underline-offset: 0.15em;
    }

    a:hover {
      color: var(--accent-hover);
    }

    ul, ol {
      padding-left: 1.4rem;
    }

    blockquote {
      padding-left: 1rem;
      border-left: 3px solid var(--border);
      color: var(--muted);
    }

    code {
      font-size: 0.9em;
      padding: 0.15em 0.35em;
      border-radius: 0.25rem;
      background: var(--bg);
    }

    pre {
      overflow-x: auto;
      padding: 1rem;
      border-radius: 0.5rem;
      background: var(--bg);
      border: 1px solid var(--border);
    }

    pre code {
      padding: 0;
      background: none;
    }

    hr {
      border: 0;
      border-top: 1px solid var(--border);
      margin: 2rem 0;
    }
  </style>
</head>
<body>
  <main>{{content}}</main>
</body>
</html>
`;

export function storagePathToPublicPath(path) {
  if (path === TEMPLATE_PATH) return null;

  if (path.startsWith(`${CONTENT_PREFIX}/`) && path.endsWith("/index.md")) {
    const slug = path
      .replace(`${CONTENT_PREFIX}/`, "")
      .replace(/\/index\.md$/, "");
    return `/${slug}`;
  }

  return null;
}
