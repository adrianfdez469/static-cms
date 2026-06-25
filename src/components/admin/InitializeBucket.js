"use client";

import { useState } from "react";
import { initializeCmsAction } from "@/app/admin/actions";

export default function InitializeBucket({ onInitialized }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleInitialize() {
    setPending(true);
    setError("");

    const result = await initializeCmsAction();
    setPending(false);

    if (result.ok) {
      onInitialized?.(result.contentPath);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="admin-panel initialize-panel">
      <h2>Initialize CMS</h2>
      <p className="admin-empty">
        The storage bucket is empty or missing the content folder. Initialize to
        create the <code>content/</code> folder and a default{" "}
        <code>template.html</code> if needed.
      </p>
      {error && <p className="admin-error">{error}</p>}
      <button
        type="button"
        className="admin-btn"
        onClick={handleInitialize}
        disabled={pending}
      >
        {pending ? "Initializing..." : "Initialize CMS"}
      </button>
    </div>
  );
}
