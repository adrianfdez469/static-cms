"use client";

import { useCallback, useEffect, useState } from "react";
import { getTreeAction, logoutAction } from "@/app/admin/actions";
import { CONTENT_PREFIX } from "@/lib/cmsConstants";
import FileEditor from "./FileEditor";
import FileTree from "./FileTree";
import FolderActions from "./FolderActions";
import InitializeBucket from "./InitializeBucket";

export default function AdminApp() {
  const [tree, setTree] = useState(null);
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [error, setError] = useState("");

  const loadTree = useCallback(async () => {
    const result = await getTreeAction();
    if (result.ok) {
      setTree(result.tree);
      setNeedsInitialization(result.needsInitialization);
      setError("");
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  function handleSelectFile(file) {
    setSelectedFile(file);
    setSelectedFolder(null);
    setSelectedPath(file.path);
  }

  function handleSelectFolder(folder) {
    setSelectedFolder(folder);
    setSelectedFile(null);
    setSelectedPath(folder.path);
  }

  function handleTreeChanged(path) {
    loadTree().then(() => {
      if (path?.endsWith(".md") || path?.endsWith(".html")) {
        setSelectedFile({
          path,
          type: "file",
          deletable: path !== "template.html",
        });
        setSelectedFolder(null);
        setSelectedPath(path);
      }
    });
  }

  function handleInitialized(contentPath) {
    loadTree().then(() => {
      setSelectedFile(null);
      setSelectedFolder({
        name: CONTENT_PREFIX,
        type: "folder",
        path: contentPath,
        children: [],
      });
      setSelectedPath(contentPath);
    });
  }

  function handleDeleted() {
    setSelectedFile(null);
    setSelectedPath(selectedFolder?.path ?? "");
    loadTree();
  }

  return (
    <>
      <header className="admin-header">
        <h1>CMS Admin</h1>
        <form action={logoutAction}>
          <button type="submit" className="admin-btn admin-btn-secondary">
            Sign out
          </button>
        </form>
      </header>

      {error && <p className="admin-error">{error}</p>}

      {needsInitialization ? (
        <main className="admin-main admin-main-centered">
          <InitializeBucket onInitialized={handleInitialized} />
        </main>
      ) : (
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <FileTree
              tree={tree}
              selectedPath={selectedPath}
              onSelectFile={handleSelectFile}
              onSelectFolder={handleSelectFolder}
            />
          </aside>

          <main className="admin-main">
            {selectedFile ? (
              <FileEditor
                file={selectedFile}
                onSaved={() => loadTree()}
                onDeleted={handleDeleted}
              />
            ) : selectedFolder ? (
              <FolderActions
                folder={selectedFolder}
                onChanged={handleTreeChanged}
              />
            ) : (
              <p className="admin-empty">
                Select a file or folder from the tree.
              </p>
            )}
          </main>
        </div>
      )}
    </>
  );
}
