"use client";

import { useEffect, useState } from "react";
import {
  deleteFileAction,
  readFileAction,
  saveFileAction,
} from "@/app/admin/actions";
import { storagePathToPublicPath } from "@/lib/cmsConstants";

export default function FileEditor({ file, onSaved, onDeleted }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!file?.path) {
      setContent("");
      setError("");
      setSuccess("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setSuccess("");

    readFileAction(file.path).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setContent(result.content);
      } else {
        setError(result.error);
        setContent("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [file?.path]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    const result = await saveFileAction(file.path, content);
    setSaving(false);

    if (result.ok) {
      setSuccess("File saved successfully.");
      onSaved?.(file.path);
    } else {
      setError(result.error);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${file.path}?`)) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const result = await deleteFileAction(file.path);
    setSaving(false);

    if (result.ok) {
      onDeleted?.(file.path);
    } else {
      setError(result.error);
    }
  }

  if (!file) {
    return <p className="admin-empty">Select a file to edit.</p>;
  }

  const previewPath = storagePathToPublicPath(file.path);

  function handlePreview() {
    if (!previewPath) return;
    window.open(previewPath, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="admin-panel">
      <h2>Editor</h2>
      <p className="admin-path">{file.path}</p>
      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}
      {loading ? (
        <p className="admin-empty">Loading file...</p>
      ) : (
        <>
          <textarea
            className="admin-editor"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {previewPath && (
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={handlePreview}
                disabled={saving}
              >
                Preview
              </button>
            )}
            {file.deletable !== false && (
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleDelete}
                disabled={saving}
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
