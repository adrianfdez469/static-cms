import {
  BUCKET,
  CONTENT_PREFIX,
  DEFAULT_TEMPLATE,
  MAX_FILE_SIZE,
  TEMPLATE_PATH,
} from "./cmsConstants";
import { createSupabaseAdminClient } from "./supabaseAdmin";

function isStorageFolder(item) {
  return item.id === null && item.metadata === null;
}

function isAllowedFile(name) {
  return name.endsWith(".md") || name.endsWith(".html");
}

function validatePath(path) {
  if (path.includes("..") || path.startsWith("/")) {
    throw new Error("Invalid path");
  }
}

function validateFile(path, contentOrBuffer) {
  validatePath(path);

  const size =
    typeof contentOrBuffer === "string"
      ? Buffer.byteLength(contentOrBuffer, "utf8")
      : contentOrBuffer.byteLength;

  if (size > MAX_FILE_SIZE) {
    throw new Error("File exceeds 5MB");
  }

  if (path.startsWith(`${CONTENT_PREFIX}/`) && !path.endsWith(".md")) {
    throw new Error("Only .md files are allowed in content/");
  }

  if (path === TEMPLATE_PATH && !path.endsWith(".html")) {
    throw new Error("Invalid template.html");
  }
}

function validateSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      "Each folder name may only contain lowercase letters, numbers, and hyphens"
    );
  }
}

function normalizeRelativePath(relativePath) {
  return relativePath.trim().replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

function normalizeRelativeFolderPath(relativePath) {
  let normalized = normalizeRelativePath(relativePath);

  if (normalized.endsWith("/index.md")) {
    normalized = normalized.slice(0, -"/index.md".length);
  } else if (normalized === "index.md") {
    normalized = "";
  }

  if (normalized.includes(".md")) {
    throw new Error("Do not include index.md in the path");
  }

  for (const segment of normalized.split("/").filter(Boolean)) {
    validateSlug(segment);
  }

  return normalized;
}

function resolveIndexMdPath(parentPath, relativeFolderPath) {
  validatePath(parentPath);

  if (!parentPath.startsWith(CONTENT_PREFIX)) {
    throw new Error("Files can only be created inside content/");
  }

  const normalized = normalizeRelativeFolderPath(relativeFolderPath);

  if (!normalized) {
    return `${parentPath}/index.md`;
  }

  return `${parentPath}/${normalized}/index.md`;
}

async function uploadRaw(path, content, contentType = "text/plain") {
  validatePath(path);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, content, { contentType, upsert: true });

  if (error) {
    throw new Error(error.message);
  }
}

function hasContentFolder(rootData) {
  return (
    rootData?.some(
      (item) => item.name === CONTENT_PREFIX && isStorageFolder(item)
    ) ?? false
  );
}

export async function getBucketStatus() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (error) {
    throw new Error(error.message);
  }

  const rootData = data ?? [];
  const hasContent = hasContentFolder(rootData);

  return {
    isEmpty: rootData.length === 0,
    hasContent,
    needsInitialization: !hasContent,
  };
}

export async function initializeCmsBucket() {
  const status = await getBucketStatus();

  if (!status.needsInitialization) {
    throw new Error("CMS is already initialized");
  }

  await uploadRaw(`${CONTENT_PREFIX}/.keep`, "", "text/plain");

  if (!(await fileExists(TEMPLATE_PATH))) {
    await saveFile(TEMPLATE_PATH, DEFAULT_TEMPLATE);
  }

  return { contentPath: CONTENT_PREFIX };
}

async function fileExists(path) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  return Boolean(data && !error);
}

export async function indexMdExistsAtPath(parentPath, relativeFolderPath) {
  const filePath = resolveIndexMdPath(parentPath, relativeFolderPath);
  return { exists: await fileExists(filePath), path: filePath };
}

async function buildTreeNode(path, name) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(path || undefined, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    throw new Error(error.message);
  }

  const children = [];

  for (const item of data ?? []) {
    const itemPath = path ? `${path}/${item.name}` : item.name;

    if (isStorageFolder(item)) {
      children.push(await buildTreeNode(itemPath, item.name));
      continue;
    }

    if (!isAllowedFile(item.name)) continue;

    children.push({
      name: item.name,
      type: "file",
      path: itemPath,
      deletable: itemPath !== TEMPLATE_PATH,
    });
  }

  return {
    name,
    type: "folder",
    path: path || "",
    children,
  };
}

export async function getFileTree() {
  const supabase = createSupabaseAdminClient();
  const rootItems = [];

  const { data: rootData, error: rootError } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (rootError) {
    throw new Error(rootError.message);
  }

  for (const item of rootData ?? []) {
    if (item.name === TEMPLATE_PATH && !isStorageFolder(item)) {
      rootItems.push({
        name: item.name,
        type: "file",
        path: TEMPLATE_PATH,
        deletable: false,
      });
      continue;
    }

    if (item.name === CONTENT_PREFIX && isStorageFolder(item)) {
      rootItems.push(await buildTreeNode(CONTENT_PREFIX, CONTENT_PREFIX));
    }
  }

  return {
    name: BUCKET,
    type: "folder",
    path: "",
    children: rootItems,
  };
}

export async function readFile(path) {
  validatePath(path);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);

  if (error || !data) {
    throw new Error("File not found");
  }

  return data.text();
}

export async function saveFile(path, content) {
  validateFile(path, content);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, content, { contentType: getContentType(path), upsert: true });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteFile(path) {
  validatePath(path);

  if (path === TEMPLATE_PATH) {
    throw new Error("template.html cannot be deleted");
  }

  if (!path.startsWith(`${CONTENT_PREFIX}/`) || !path.endsWith(".md")) {
    throw new Error("Only .md files in content/ can be deleted");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createFile(parentPath, relativeFolderPath, content) {
  const filePath = resolveIndexMdPath(parentPath, relativeFolderPath);

  const pageName =
    filePath.replace(/\/index\.md$/, "").split("/").pop() || "page";
  const initialContent =
    content ??
    `# ${pageName.replace(/-/g, " ")}\n\nPage content.\n`;

  await saveFile(filePath, initialContent);
  return filePath;
}

export async function uploadFile(parentPath, relativeFolderPath, buffer) {
  const filePath = resolveIndexMdPath(parentPath, relativeFolderPath);
  validateFile(filePath, buffer);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: "text/markdown", upsert: true });

  if (error) {
    throw new Error(error.message);
  }

  return filePath;
}

function getContentType(path) {
  if (path.endsWith(".md")) return "text/markdown";
  if (path.endsWith(".html")) return "text/html";
  return "text/plain";
}
