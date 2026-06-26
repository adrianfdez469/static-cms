"use server";

import { invalidateByTag } from "@vercel/functions";
import { revalidatePath, updateTag } from "next/cache";
import { pageTag } from "./contentBuilder";
import { TEMPLATE_PATH, storagePathToPublicPath } from "./cmsConstants";

const CMS_TEMPLATE_TAG = "cms:template";
const CMS_PAGES_TAG = "cms:pages";

async function invalidateCdnTags(tags) {
  const tagList = Array.isArray(tags) ? tags : [tags];
  await invalidateByTag(tagList);
}

export async function revalidateAfterFileChange(path) {
  if (path === TEMPLATE_PATH) {
    updateTag(CMS_TEMPLATE_TAG);
    updateTag(CMS_PAGES_TAG);
    await invalidateCdnTags([CMS_TEMPLATE_TAG, CMS_PAGES_TAG]);
    return;
  }

  if (path.startsWith("content/")) {
    const publicPath = storagePathToPublicPath(path);
    if (publicPath) {
      revalidatePath(publicPath);
      const slug = publicPath.replace(/^\//, "").split("/").filter(Boolean);
      const tag = pageTag(slug);
      updateTag(tag);
      await invalidateCdnTags(tag);
    }

    updateTag("cms:routes");
  }
}
