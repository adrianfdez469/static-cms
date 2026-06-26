import {
  buildNotFoundPage,
  buildPage,
  buildServerErrorPage,
  pageTag,
} from "@/lib/contentBuilder";

export const revalidate = false;

const CMS_PAGES_TAG = "cms:pages";
const CMS_TEMPLATE_TAG = "cms:template";

function buildPageHeaders(slug) {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Vercel-CDN-Cache-Control": "max-age=31536000",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Vercel-Cache-Tag": `${pageTag(slug)}, ${CMS_PAGES_TAG}, ${CMS_TEMPLATE_TAG}`,
  };
}

const ERROR_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
};

export async function GET(_request, { params }) {
  const { slug } = await params;

  try {
    const html = await buildPage(slug);

    if (!html) {
      return new Response(await buildNotFoundPage(), {
        status: 404,
        headers: ERROR_HEADERS,
      });
    }

    return new Response(html, {
      status: 200,
      headers: buildPageHeaders(slug),
    });
  } catch (error) {
    console.error("CMS render error:", error);
    return new Response(await buildServerErrorPage(), {
      status: 500,
      headers: ERROR_HEADERS,
    });
  }
}
