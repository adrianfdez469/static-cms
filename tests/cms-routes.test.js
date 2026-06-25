import { describe, expect, it } from "vitest";
import { GET } from "@/app/[[...slug]]/route";
import { INVALID_SLUG, TEST_SLUG } from "./fixtures/cms.js";

function createContext(slug) {
  const path = slug.length ? `/${slug.join("/")}` : "/";
  return {
    request: new Request(`http://localhost${path}`),
    context: { params: Promise.resolve({ slug }) },
  };
}

describe("CMS public routes", () => {
  it("returns HTTP 200 for a valid content URL", async () => {
    const { request, context } = createContext([TEST_SLUG]);
    const response = await GET(request, context);

    expect(response.status).toBe(200);
  });

  it("returns HTML generated from the corresponding index.md", async () => {
    const { request, context } = createContext([TEST_SLUG]);
    const response = await GET(request, context);
    const html = await response.text();

    expect(html).toContain("<main>");
    expect(html).toContain("<h1>CMS fixture heading</h1>");
    expect(html).toContain("<strong>bold text</strong>");
  });

  it("returns HTTP 404 for URLs that do not match content folders", async () => {
    const { request, context } = createContext([INVALID_SLUG]);
    const response = await GET(request, context);

    expect(response.status).toBe(404);
  });
});
