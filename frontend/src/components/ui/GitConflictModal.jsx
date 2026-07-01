import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, FileEdit, ChevronDown, ChevronRight, Check, Loader2, X } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';

function countConflicts(content) {
  const matches = content.match(/^<<<<<<<.*$/gm);
  return matches ? matches.length : 0;
}

export default function GitConflictModal({ open, files, branchName, onResolveFile, onFinalize, onClose }) {
  const { readFile } = useProjectStore();
  const [expandedFile, setExpandedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvedFiles, setResolvedFiles] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [conflictCounts, setConflictCounts] = useState({});

  useEffect(() => {
    if (!open) {
      setExpandedFile(null);
      setFileContent('');
      setResolvedFiles(new Set());
      setConflictCounts({});
    }
  }, [open]);

  useEffect(() => {
    if (!open || !expandedFile) return;
    let cancelled = false;
    setLoading(true);
    readFile(expandedFile).then((content) => {
      if (!cancelled) {
        setFileContent(content);
        setConflictCounts((prev) => ({ ...prev, [expandedFile]: countConflicts(content) }));
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [expandedFile, open]);

  const handleToggle = useCallback((file) => {
    if (resolvedFiles.has(file)) return;
    setExpandedFile((prev) => (prev === file ? null : file));
    setFileContent('');
  }, [resolvedFiles]);

  const handleResolve = useCallback(async (filepath) => {
    setSaving(true);
    try {
      await onResolveFile(filepath, fileContent);
      setResolvedFiles((prev) => new Set([...prev, filepath]));
      setExpandedFile(null);
      setFileContent('');
    } finally {
      setSaving(false);
    }
  }, [fileContent, onResolveFile]);

  const allResolved = files.length > 0 && files.every((f) => resolvedFiles.has(f));

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
      <div className="git-conflict-modal" onClick={(e) => e.stopPropagation()}>
        <div className="git-conflict-header">
          <div className="git-conflict-icon">
            <AlertTriangle size={20} />
          </div>
          <h3>Conflito ao aplicar alterações</h3>
          <button className="icon-btn small" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="git-conflict-body">
          <p className="git-conflict-msg">
            Não foi possível aplicar suas alterações automaticamente ao mudar para a branch{' '}
            <span className="git-conflict-branch">"{branchName}"</span>.
            Resolva os conflitos nos arquivos abaixo editando o conteúdo manualmente.
          </p>
          {files.length > 0 && (
            <ul className="git-conflict-list">
              {files.map((file) => {
                const isExpanded = expandedFile === file;
                const isResolved = resolvedFiles.has(file);
                const count = conflictCounts[file];
                return (
                  <li key={file} className={`git-conflict-item ${isResolved ? 'git-conflict-item-resolved' : ''}`}>
                    <button
                      className="git-conflict-item-header"
                      onClick={() => handleToggle(file)}
                      disabled={isResolved}
                    >
                      <span className="git-conflict-item-chevron">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                      <span className="git-conflict-badge">
                        {isResolved ? <Check size={14} /> : <FileEdit size={14} />}
                      </span>
                      <span className="git-conflict-filepath">{file}</span>
                      {count !== undefined && (
                        <span className={`git-conflict-count ${isResolved ? 'git-conflict-count-resolved' : ''}`}>
                          {isResolved ? 'Resolvido' : `${count} conflito${count !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </button>
                    {isExpanded && !isResolved && (
                      <div className="git-conflict-expand">
                        {loading ? (
                          <div className="git-conflict-loading">
                            <Loader2 size={16} className="spin" />
                            <span>Carregando conteúdo...</span>
                          </div>
                        ) : (
                          <>
                            <textarea
                              className="git-conflict-textarea"
                              value={fileContent}
                              onChange={(e) => setFileContent(e.target.value)}
                              spellCheck={false}
                            />
                            <div className="git-conflict-expand-actions">
                              <button
                                className="confirm-modal-btn cancel small"
                                onClick={() => { setExpandedFile(null); setFileContent(''); }}
                              >
                                Cancelar
                              </button>
                              <button
                                className="confirm-modal-btn primary small"
                                onClick={() => handleResolve(file)}
                                disabled={saving}
                              >
                                {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                                Resolver
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="git-conflict-hint">
            Clique em um arquivo para expandir e editar o conteúdo. Remova os marcadores de conflito e escolha as alterações desejadas.
          </p>
        </div>
        <div className="git-conflict-footer">
          <button
            className={`confirm-modal-btn ${allResolved ? 'primary' : 'cancel'}`}
            onClick={allResolved ? onFinalize : onClose}
          >
            {allResolved ? 'Concluir' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
