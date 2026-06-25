import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request) {
  const { secret, paths = [], tags = [] } = await request.json();

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return Response.json({ revalidated: true, paths, tags });
}
