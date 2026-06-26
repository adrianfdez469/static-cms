"use server";

import { revalidatePath, updateTag } from "next/cache";
import { pageTag } from "./contentBuilder";
import { TEMPLATE_PATH, storagePathToPublicPath } from "./cmsConstants";

export async function revalidateAfterFileChange(path) {
  if (path === TEMPLATE_PATH) {
    updateTag("cms:template");
    updateTag("cms:pages");
    return;
  }

  if (path.startsWith("content/")) {
    
    const publicPath = storagePathToPublicPath(path);
    if (publicPath) {
      revalidatePath(publicPath);
      const slug = publicPath.replace(/^\//, "").split("/").filter(Boolean);
      updateTag(pageTag(slug));
    }
  }
}
