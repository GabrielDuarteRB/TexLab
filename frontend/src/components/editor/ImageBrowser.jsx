import { useMemo, useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, Image, Search } from 'lucide-react';

function normalizeNodes(tree) {
  if (!Array.isArray(tree)) return [];
  return tree;
}

function filterTree(nodes, query) {
  if (!query) return nodes;
  const q = query.toLowerCase();
  const result = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.name.toLowerCase().includes(q)) result.push(node);
    } else {
      const children = filterTree(node.children || [], query);
      if (children.length > 0 || node.name.toLowerCase().includes(q)) {
        result.push({ ...node, children });
      }
    }
  }
  return result;
}

function findPathInTree(nodes, targetPath) {
  for (const node of nodes) {
    if (node.path === targetPath) return true;
    if (node.type === 'directory') {
      if (findPathInTree(node.children || [], targetPath)) return true;
    }
  }
  return false;
}

export default function ImageBrowser({
  roots,
  mode,
  onPick,
  onCancel,
  initialPath = null,
}) {
  const [expanded, setExpanded] = useState(() => {
    const set = new Set();
    if (initialPath) {
      const parts = initialPath.split('/');
      let acc = '';
      for (const p of parts.slice(0, -1)) {
        acc = acc ? `${acc}/${p}` : p;
        set.add(acc);
      }
    } else {
      roots.forEach((r) => set.add(r.path));
    }
    return set;
  });
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (initialPath) {
      const parts = initialPath.split('/');
      let acc = '';
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const p of parts.slice(0, -1)) {
          acc = acc ? `${acc}/${p}` : p;
          next.add(acc);
        }
        return next;
      });
    }
  }, [initialPath]);

  const filteredRoots = useMemo(() => {
    return roots.map((r) => ({ ...r, tree: filterTree(r.tree || [], query) }));
  }, [roots, query]);

  const toggle = (path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="image-browser">
      <div className="image-browser-search">
        <Search size={12} />
        <input
          type="text"
          placeholder="Buscar por nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {filteredRoots.length === 0 || filteredRoots.every((r) => (r.tree || []).length === 0) ? (
        <div className="image-browser-empty">
          {query ? 'Nenhum resultado para a busca.' : 'Nenhuma imagem encontrada.'}
        </div>
      ) : (
        <ul className="image-browser-tree">
          {filteredRoots.map((root) => (
            <RootNode
              key={root.path}
              root={root}
              expanded={expanded}
              onToggle={toggle}
              mode={mode}
              onPick={onPick}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RootNode({ root, expanded, onToggle, mode, onPick }) {
  const isOpen = expanded.has(root.path);
  const empty = (root.tree || []).length === 0;
  return (
    <li className="image-browser-root">
      <button
        className="image-browser-item dir"
        onClick={() => onToggle(root.path)}
        disabled={empty}
      >
        {empty ? <span className="image-browser-chevron-empty" /> : isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={12} />
        <span className="image-browser-name">{root.name || root.path}</span>
        {mode === 'pickFolder' && (
          <button
            className="image-browser-pick-folder"
            onClick={(e) => {
              e.stopPropagation();
              onPick(root);
            }}
          >
            Selecionar pasta
          </button>
        )}
      </button>
      {isOpen && !empty && (
        <ul className="image-browser-children">
          {root.tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              expanded={expanded}
              onToggle={onToggle}
              mode={mode}
              onPick={onPick}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function TreeNode({ node, expanded, onToggle, mode, onPick }) {
  if (node.type === 'file') {
    return (
      <li>
        <button
          className="image-browser-item file"
          disabled={mode === 'pickFolder'}
          onClick={() => onPick(node)}
        >
          <span className="image-browser-chevron-empty" />
          <Image size={12} />
          <span className="image-browser-name">{node.name}</span>
          {mode !== 'pickFolder' && (
            <span className="image-browser-pick">Selecionar</span>
          )}
        </button>
      </li>
    );
  }
  const isOpen = expanded.has(node.path);
  const empty = (node.children || []).length === 0;
  return (
    <li>
      <button
        className="image-browser-item dir"
        onClick={() => onToggle(node.path)}
        disabled={empty}
      >
        {empty ? <span className="image-browser-chevron-empty" /> : isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={12} />
        <span className="image-browser-name">{node.name}</span>
        {mode === 'pickFolder' && (
          <button
            className="image-browser-pick-folder"
            onClick={(e) => {
              e.stopPropagation();
              onPick(node);
            }}
          >
            Selecionar pasta
          </button>
        )}
      </button>
      {isOpen && !empty && (
        <ul className="image-browser-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              mode={mode}
              onPick={onPick}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
