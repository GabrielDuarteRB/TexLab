import { FileText, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import useProjectStore from '../../store/useProjectStore.js';

export default function FileTree({ files }) {
  return (
    <ul className="file-tree">
      {files.map((file) => (
        <FileNode key={file.path} file={file} />
      ))}
    </ul>
  );
}

function FileNode({ file }) {
  const [expanded, setExpanded] = useState(false);
  const { openFile, currentFile } = useProjectStore();

  if (file.type === 'directory') {
    return (
      <li>
        <button className="file-tree-item" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={14} />
          <span>{file.name}</span>
        </button>
        {expanded && file.children && <FileTree files={file.children} />}
      </li>
    );
  }

  return (
    <li>
      <button
        className={`file-tree-item file ${currentFile === file.path ? 'active' : ''}`}
        onClick={() => openFile(file.path)}
      >
        <FileText size={14} />
        <span>{file.name}</span>
      </button>
    </li>
  );
}
