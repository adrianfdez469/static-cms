"use client";

import { useState } from "react";
import {
  createFileAction,
  indexMdExistsAction,
  uploadFileAction,
} from "@/app/admin/actions";
import { CONTENT_PREFIX } from "@/lib/cmsConstants";

async function confirmOverwrite(parentPath, relativePath) {
  const check = await indexMdExistsAction(parentPath, relativePath);

  if (!check.ok) {
    return { proceed: false, error: check.error };
  }

  if (!check.exists) {
    return { proceed: true };
  }

  const confirmed = window.confirm(
    `index.md already exists at ${check.path}. Overwrite?`
  );

  return { proceed: confirmed };
}

export default function FolderActions({ folder, onChanged }) {
  const [relativePath, setRelativePath] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  if (!folder || folder.type !== "folder") {
    return null;
  }

  const isContentFolder =
    folder.path === CONTENT_PREFIX || folder.path.startsWith(`${CONTENT_PREFIX}/`);

  if (!isContentFolder) {
    return (
      <div className="admin-panel">
        <h2>Folder</h2>
        <p className="admin-path">{folder.path || "CMS"}</p>
        <p className="admin-empty">
          Create actions are only available inside content/.
        </p>
      </div>
    );
  }

  async function handleCreateFile(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    const path = relativePath.trim();
    const overwriteCheck = await confirmOverwrite(folder.path, path);

    if (!overwriteCheck.proceed) {
      setPending(false);
      if (overwriteCheck.error) setError(overwriteCheck.error);
      return;
    }

    const result = await createFileAction(folder.path, path);
    setPending(false);

    if (result.ok) {
      setSuccess(`Created: ${result.path}`);
      setRelativePath("");
      onChanged?.(result.path);
    } else {
      setError(result.error);
    }
  }

  async function handleUpload(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setPending(true);
    setError("");
    setSuccess("");

    const path = relativePath.trim();
    const overwriteCheck = await confirmOverwrite(folder.path, path);

    if (!overwriteCheck.proceed) {
      setPending(false);
      input.value = "";
      if (overwriteCheck.error) setError(overwriteCheck.error);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadFileAction(folder.path, path, formData);
    setPending(false);
    input.value = "";

    if (result.ok) {
      setSuccess(`Uploaded: ${result.path}`);
      setRelativePath("");
      onChanged?.(result.path);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="admin-panel folder-actions">
      <h2>Folder</h2>
      <p className="admin-path">{folder.path}</p>
      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}

      <label>
        Folder path (relative to this folder)
        <input
          type="text"
          value={relativePath}
          onChange={(event) => setRelativePath(event.target.value)}
          placeholder="e.g. blog/june/company-update"
          spellCheck={false}
        />
      </label>
      <p className="admin-empty">
        Leave empty to use this folder. index.md is created automatically at the
        target path.
      </p>

      <form onSubmit={handleCreateFile}>
        <div className="folder-actions-row">
          <button type="submit" className="admin-btn" disabled={pending}>
            Create .md file
          </button>
        </div>
      </form>

      <label>
        Upload .md file (max. 5MB)
        <input
          type="file"
          accept=".md,text/markdown"
          onChange={handleUpload}
          disabled={pending}
        />
      </label>
      <p className="admin-empty">
        The uploaded content is saved as index.md at the target path.
      </p>
    </div>
  );
}
