"use client";

import { useEffect, useState } from "react";
import {
  deleteFileAction,
  readFileAction,
  saveFileAction,
} from "@/app/admin/actions";
import { storagePathToPublicPath, TEMPLATE_PATH } from "@/lib/cmsConstants";
import TemplateAiChat from "./TemplateAiChat";

export default function FileEditor({ file, onSaved, onDeleted }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);

  const isTemplate = file?.path === TEMPLATE_PATH;

  useEffect(() => {
    if (!file?.path) {
      setContent("");
      setError("");
      setSuccess("");
      setAiOpen(false);
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

  useEffect(() => {
    if (!isTemplate) {
      setAiOpen(false);
    }
  }, [isTemplate]);

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
    <div className={`admin-panel${aiOpen ? " admin-panel-with-ai" : ""}`}>
      <h2>Editor</h2>
      <p className="admin-path">{file.path}</p>
      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}
      {loading ? (
        <p className="admin-empty">Loading file...</p>
      ) : (
        <div className={aiOpen ? "admin-editor-layout" : undefined}>
          <div className="admin-editor-column">
            {aiStreaming && (
              <p className="admin-ai-streaming-badge">Updating template…</p>
            )}
            <textarea
              className={`admin-editor${aiStreaming ? " admin-editor-streaming" : ""}`}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn"
                onClick={handleSave}
                disabled={saving || aiStreaming}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              {isTemplate && (
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setAiOpen((open) => !open)}
                  disabled={saving}
                >
                  {aiOpen ? "Hide AI" : "Style with AI"}
                </button>
              )}
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
          </div>
          {isTemplate && (
            <TemplateAiChat
              open={aiOpen}
              currentTemplate={content}
              onTemplateUpdate={setContent}
              onStreamingChange={setAiStreaming}
              onClose={() => setAiOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
