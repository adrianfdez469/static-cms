/** Fixed slug used only in tests — not tied to real bucket content. */
export const TEST_SLUG = "cms-test-valid-page";
export const INVALID_SLUG = "cms-test-missing-page-404";

export const TEMPLATE_PATH = "template.html";

export function storagePathForSlug(slug) {
  return `content/${slug}/index.md`;
}

export const TEST_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<body>
  <main>{{content}}</main>
</body>
</html>`;

export const TEST_MARKDOWN =
  "# CMS fixture heading\n\nFixture paragraph with **bold text**.";
