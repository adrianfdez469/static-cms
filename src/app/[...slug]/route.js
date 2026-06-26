import {
  buildIndexPage,
  buildNotFoundPage,
  buildPage,
  buildServerErrorPage,
} from "@/lib/contentBuilder";

export const revalidate = false;

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
};

const ERROR_HEADERS = {
  ...HTML_HEADERS,
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
      headers: HTML_HEADERS,
    });
  } catch (error) {
    console.error("CMS render error:", error);
    return new Response(await buildServerErrorPage(), {
      status: 500,
      headers: ERROR_HEADERS,
    });
  }
}
