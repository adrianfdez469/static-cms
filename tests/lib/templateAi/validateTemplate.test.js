import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE } from "@/lib/cmsConstants";
import { validateTemplate } from "@/lib/templateAi/validateTemplate";

const VALID_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>CMS</title>
  <style>body { background: #faf8f5; }</style>
</head>
<body>
  <main>{{content}}</main>
</body>
</html>`;

describe("validateTemplate", () => {
  it("accepts a valid template with {{content}}", () => {
    const result = validateTemplate(VALID_TEMPLATE);
    expect(result.ok).toBe(true);
    expect(result.html).toBe(VALID_TEMPLATE);
  });

  it("rejects template without {{content}} placeholder", () => {
    const result = validateTemplate("<!DOCTYPE html><html><body><main></main></body></html>");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/{{content}}/);
  });

  it("rejects template with <script> tags", () => {
    const result = validateTemplate(
      `<!DOCTYPE html><html><body><script>alert(1)</script><main>{{content}}</main></body></html>`
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/forbidden/i);
  });

  it("rejects template with inline onclick handlers", () => {
    const result = validateTemplate(
      `<!DOCTYPE html><html><body><main onclick="alert(1)">{{content}}</main></body></html>`
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/forbidden/i);
  });

  it("rejects template that exceeds max size", () => {
    const oversized = `<!DOCTYPE html><html><body><main>{{content}}</main>${"x".repeat(MAX_FILE_SIZE)}</body></html>`;
    const result = validateTemplate(oversized);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/maximum size/i);
  });
});
