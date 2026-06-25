import {
  buildNotFoundPage,
  extractRenderableTemplateParts,
} from "@/lib/contentBuilder";

export default async function NotFound() {
  const html = await buildNotFoundPage();
  const { styles, links, bodyHtml } = extractRenderableTemplateParts(html);

  return (
    <>
      {links.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {styles.map((css, index) => (
        <style key={index} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
