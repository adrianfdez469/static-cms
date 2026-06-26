import { revalidatePath, revalidateTag } from "next/cache";
import { pageTag } from "./contentBuilder";
import { TEMPLATE_PATH, storagePathToPublicPath } from "./cmsConstants";

export function revalidateAfterFileChange(path) {
  if (path === TEMPLATE_PATH) {
    revalidateTag("cms:template");
    revalidateTag("cms:pages");
    return;
  }

  if (path.startsWith("content/")) {
    
    const publicPath = storagePathToPublicPath(path);
    if (publicPath) {
      revalidatePath(publicPath);
      const slug = publicPath.replace(/^\//, "").split("/").filter(Boolean);
      revalidateTag(pageTag(slug));
    }
  }
}
