import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FilePlus, FileMinus, FileEdit, FileQuestion, ChevronRight, ChevronDown } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';

const STATUS_CONFIG = {
  added: { icon: FilePlus, color: 'var(--success)', label: 'Adicionado' },
  modified: { icon: FileEdit, color: '#e0a800', label: 'Modificado' },
  deleted: { icon: FileMinus, color: 'var(--error)', label: 'Excluído' },
  untracked: { icon: FileQuestion, color: 'var(--text-muted)', label: 'Não rastreado' },
  renamed: { icon: FileEdit, color: '#89b4fa', label: 'Renomeado' },
};

function parseDiffLines(diffText) {
  if (!diffText) return [];
  return diffText.split('\n').map((line, i) => {
    if (line.startsWith('+')) return { type: 'add', content: line, key: `a${i}` };
    if (line.startsWith('-')) return { type: 'del', content: line, key: `d${i}` };
    if (line.startsWith('@@')) return { type: 'hunk', content: line, key: `h${i}` };
    return { type: 'ctx', content: line, key: `c${i}` };
  });
}

function DiffFileItem({ file }) {
  const { expandedFiles, toggleFileDiff, fileDiffs, fetchFileDiff } = useProjectStore();
  const expanded = !!expandedFiles[file.path];
  const diffContent = fileDiffs[file.path];
  const config = STATUS_CONFIG[file.type] || STATUS_CONFIG.modified;
  const Icon = config.icon;
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const lines = expanded ? parseDiffLines(diffContent) : [];

  const handleClick = async () => {
    toggleFileDiff(file.path);
    if (!expanded && diffContent === undefined) {
      await fetchFileDiff(file.path);
    }
  };

  return (
    <li className="git-diff-item-wrapper">
      <div className="git-diff-item" onClick={handleClick} style={{ cursor: 'pointer' }}>
        <span className="git-diff-chevron">
          <Chevron size={14} />
        </span>
        <span className="git-diff-badge" style={{ color: config.color }}>
          <Icon size={14} />
        </span>
        <span className="git-diff-filepath">{file.path}</span>
        <span className="git-diff-type" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>
      {expanded && (
        <div className="git-diff-code">
          {lines.length === 0 ? (
            <div className="git-diff-line git-diff-line-ctx">Sem alterações para exibir</div>
          ) : (
            lines.map((line) => (
              <div key={line.key} className={`git-diff-line git-diff-line-${line.type}`}>
                {line.content}
              </div>
            ))
          )}
        </div>
      )}
    </li>
  );
}

export default function GitDiffModal({ open, files, branchName, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="git-diff-modal" onClick={(e) => e.stopPropagation()}>
        <div className="git-diff-header">
          <h3>Alterações na branch <span className="git-diff-branch">{branchName}</span></h3>
          <button className="icon-btn small" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="git-diff-content">
          {files.length === 0 ? (
            <p className="git-diff-empty">Nenhuma alteração pendente.</p>
          ) : (
            <ul className="git-diff-list">
              {files.map((file) => (
                <DiffFileItem key={file.path} file={file} />
              ))}
            </ul>
          )}
        </div>
        <div className="git-diff-footer">
          <button className="confirm-modal-btn cancel" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
