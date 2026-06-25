import { describe, expect, it } from "vitest";
import { buildNotFoundPage, buildServerErrorPage } from "./contentBuilder";
import { extractRenderableTemplateParts, renderTemplate } from "./templateHtml";

describe("templateHtml", () => {
  it("renders content into the template placeholder", () => {
    const html = renderTemplate("<main>{{content}}</main>", "<p>Error</p>");

    expect(html).toBe("<main><p>Error</p></main>");
    expect(html).not.toContain("{{content}}");
  });

  it("extracts template parts for React rendering", () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>body { color: red; }</style>
  <link rel="stylesheet" href="https://example.com/style.css" />
</head>
<body><main>Error</main></body>
</html>`;

    const parts = extractRenderableTemplateParts(html);

    expect(parts.styles).toEqual(["body { color: red; }"]);
    expect(parts.links).toEqual(["https://example.com/style.css"]);
    expect(parts.bodyHtml).toBe("<main>Error</main>");
  });
});

describe("error pages", () => {
  it("wraps 404 content in the default template when storage is unavailable", async () => {
    const html = await buildNotFoundPage();

    expect(html).toContain("404 - Page not found");
    expect(html).toContain("The requested page does not exist.");
    expect(html).not.toContain("{{content}}");
    expect(html).toMatch(/<!DOCTYPE html>|<html/i);
  });

  it("wraps 500 content in the default template when storage is unavailable", async () => {
    const html = await buildServerErrorPage();

    expect(html).toContain("500 - Server error");
    expect(html).toContain("Something went wrong while rendering this page.");
    expect(html).not.toContain("{{content}}");
    expect(html).toMatch(/<!DOCTYPE html>|<html/i);
  });
});
