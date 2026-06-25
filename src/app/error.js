"use client";

import { useEffect, useState } from "react";
import { extractRenderableTemplateParts } from "@/lib/templateHtml";

export default function Error({ reset }) {
  const [parts, setParts] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/cms-error-page")
      .then((response) => response.text())
      .then((html) => {
        if (!cancelled) {
          setParts(extractRenderableTemplateParts(html));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setParts({
            styles: [],
            links: [],
            bodyHtml: `<main>
  <h1>500 - Server error</h1>
  <p>Something went wrong while rendering this page.</p>
  <p><a href="/">Back to home</a></p>
</main>`,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!parts) {
    return null;
  }

  return (
    <>
      {parts.links.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {parts.styles.map((css, index) => (
        <style key={index} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: parts.bodyHtml }} />
      <p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </p>
    </>
  );
}
