export const BUCKET = "CMS";
export const TEMPLATE_PATH = "template.html";
export const CONTENT_PREFIX = "content";
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>CMS</title>
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
