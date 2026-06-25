"use client";

import { useState } from "react";

function TreeNode({ node, selectedPath, onSelectFile, onSelectFolder, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 2);

  if (node.type === "file") {
    return (
      <li className="file-tree-item">
        <button
          type="button"
          className={`file-tree-button ${selectedPath === node.path ? "selected" : ""}`}
          onClick={() => onSelectFile(node)}
        >
          <span>{node.name}</span>
        </button>
      </li>
    );
  }

  return (
    <li className="file-tree-item">
      <button
        type="button"
        className={`file-tree-button ${selectedPath === node.path ? "selected" : ""}`}
        onClick={() => {
          setExpanded((value) => !value);
          onSelectFolder(node);
        }}
      >
        <span>{expanded ? "▼" : "▶"}</span>
        <span>{node.name || "CMS"}</span>
      </button>
      {expanded && node.children?.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.path || child.name}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onSelectFolder={onSelectFolder}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FileTree({
  tree,
  selectedPath,
  onSelectFile,
  onSelectFolder,
}) {
  if (!tree) {
    return <p className="admin-empty">Loading tree...</p>;
  }

  return (
    <ul className="file-tree">
      <TreeNode
        node={tree}
        selectedPath={selectedPath}
        onSelectFile={onSelectFile}
        onSelectFolder={onSelectFolder}
      />
    </ul>
  );
}
