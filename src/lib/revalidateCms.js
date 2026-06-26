"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { pageTag } from "./contentBuilder";
import { TEMPLATE_PATH, storagePathToPublicPath } from "./cmsConstants";

export async function revalidateAfterFileChange(path) {
  if (path === TEMPLATE_PATH) {
    updateTag("cms:template", "max");
    updateTag("cms:pages", "max");
    return;
  }

  if (path.startsWith("content/")) {
    
    const publicPath = storagePathToPublicPath(path);
    if (publicPath) {
      revalidatePath(publicPath, "max");
      const slug = publicPath.replace(/^\//, "").split("/").filter(Boolean);
      updateTag(pageTag(slug), "max");
    }
  }
}
