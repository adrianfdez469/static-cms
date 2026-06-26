import { marked } from "marked";
import { unstable_cache } from "next/cache";
import {
  BUCKET,
  CONTENT_PREFIX,
  DEFAULT_TEMPLATE,
  TEMPLATE_PATH,
} from "./cmsConstants";
import { createSupabaseClient } from "./supabase";
import { renderTemplate } from "./templateHtml";

export { extractRenderableTemplateParts } from "./templateHtml";

const isDev = process.env.NODE_ENV === "development";

function withCmsCache(fn, keyParts, tags) {
  if (isDev) {
    return fn();
  }

  return unstable_cache(fn, keyParts, { revalidate: false, tags })();
}

export function pageTag(slug) {
  return `cms:page:${slug.join("/")}`;
}

function toStoragePath(slug) {
  return `${CONTENT_PREFIX}/${slug.join("/")}/index.md`;
}

function storagePathToUrl(storagePath) {
  const relative = storagePath
    .replace(`${CONTENT_PREFIX}/`, "")
    .replace(/\/index\.md$/, "");
  return `/${relative}`;
}

async function downloadFile(path) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);

  if (error || !data) {
    return null;
  }

  return data.text();
}

const fetchTemplate = unstable_cache(
  async () => {
    const template = await downloadFile(TEMPLATE_PATH);
    return template ?? DEFAULT_TEMPLATE;
  },
  ["cms-template"],
  { revalidate: false, tags: ["cms:template", "cms:pages"] }
);

async function getTemplate() {
  if (isDev) {
    const template = await downloadFile(TEMPLATE_PATH);
    return template ?? DEFAULT_TEMPLATE;
  }

  return fetchTemplate();
}

function isStorageFolder(item) {
  return item.id === null && item.metadata === null;
}

export async function listContentRoutes() {
  const supabase = createSupabaseClient();
  const routes = [];
  const queue = [CONTENT_PREFIX];

  while (queue.length > 0) {
    const path = queue.shift();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(path, { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (error) {
      console.error(`Storage list error at "${path}":`, error.message);
      return routes;
    }

    if (!data?.length) continue;

    for (const item of data) {
      const itemPath = `${path}/${item.name}`;

      if (isStorageFolder(item)) {
        queue.push(itemPath);
        continue;
      }

      if (item.name === "index.md") {
        routes.push(storagePathToUrl(itemPath));
      }
    }
  }

  return routes.sort();
}

export async function listContentRoutesCached() {
  return withCmsCache(listContentRoutes, ["cms-routes"], ["cms:routes"]);
}

async function buildPageUncached(slug) {
  const storagePath = toStoragePath(slug);
  if (!storagePath) return null;

  const [template, markdown] = await Promise.all([
    getTemplate(),
    downloadFile(storagePath),
  ]);

  if (!markdown) return null;

  const contentHtml = marked.parse(markdown);
  return renderTemplate(template, contentHtml);
}

export async function buildPage(slug) {
  const slugKey = slug.join("/");

  return withCmsCache(
    () => buildPageUncached(slug),
    ["cms-page", slugKey],
    [pageTag(slug), "cms:pages"]
  );
}

function buildErrorContentHtml({ heading, message }) {
  return `<main>
    <h1>${heading}</h1>
    <p>${message}</p>
    <p><a href="/">Back to home</a></p>
  </main>`;
}

async function buildErrorPage({ heading, message }) {
  const template = await getTemplate();
  const contentHtml = buildErrorContentHtml({ heading, message });
  return renderTemplate(template, contentHtml);
}

export function buildNotFoundPage() {
  return buildErrorPage({
    heading: "404 - Page not found",
    message: "The requested page does not exist.",
  });
}

export function buildServerErrorPage() {
  return buildErrorPage({
    heading: "500 - Server error",
    message: "Something went wrong while rendering this page.",
  });
}
