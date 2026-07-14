import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DiffEditor } from '@monaco-editor/react';
import { X, Loader2 } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';

function parseDiffText(diffText) {
  if (!diffText) return { original: '', modified: '' };
  const originalLines = [];
  const modifiedLines = [];
  const lines = diffText.split('\n');
  for (const line of lines) {
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('new file') || line.startsWith('deleted file') || line.startsWith('rename ') || line.startsWith('Binary ')) {
      continue;
    }
    if (line.startsWith('@@')) continue;
    if (line.startsWith('+')) {
      modifiedLines.push(line.slice(1));
    } else if (line.startsWith('-')) {
      originalLines.push(line.slice(1));
    } else if (line.startsWith(' ')) {
      originalLines.push(line.slice(1));
      modifiedLines.push(line.slice(1));
    } else if (line.trim() === '') {
      originalLines.push('');
      modifiedLines.push('');
    }
  }
  return { original: originalLines.join('\n'), modified: modifiedLines.join('\n') };
}

export default function GitDiffModal({ open, mode, file, commit, onClose }) {
  const fetchFileDiff = useProjectStore((s) => s.fetchFileDiff);
  const fetchCommitDiff = useProjectStore((s) => s.fetchCommitDiff);
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setOriginal('');
    setModified('');

    (async () => {
      try {
        if (mode === 'commit') {
          if (!commit?.hash) {
            throw new Error('Hash do commit ausente');
          }
          const diff = await fetchCommitDiff(commit.hash);
          const { original: o, modified: m } = parseDiffText(diff);
          setOriginal(o);
          setModified(m);
        } else if (mode === 'file') {
          const diff = await fetchFileDiff(file.path);
          if (diff && diff.trim()) {
            const { original: o, modified: m } = parseDiffText(diff);
            setOriginal(o);
            setModified(m);
          } else if (file.type === 'untracked') {
            setOriginal('');
            const content = await (await fetch(`/api/projects/${useProjectStore.getState().currentProject?.id}/files/${file.path}`)).text();
            setModified(content);
          } else {
            setOriginal('');
            setModified('');
          }
        }
      } catch (err) {
        setError(err.message || 'Erro ao carregar diff');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, mode, file, commit, fetchFileDiff, fetchCommitDiff]);

  if (!open) return null;

  let title = '';
  if (mode === 'file') {
    title = file?.path || '';
  } else if (mode === 'commit') {
    title = commit?.message || commit?.shortHash || '';
  }

  return createPortal(
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="git-diff-modal" onClick={(e) => e.stopPropagation()}>
        <div className="git-diff-header">
          <div className="git-diff-title">
            <span className="git-diff-label">Diff:</span>
            <span className="git-diff-branch">{title}</span>
          </div>
          <button className="icon-btn small" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="git-diff-content">
          {loading ? (
            <div className="git-diff-loading">
              <Loader2 size={20} className="spin" />
              <span>Carregando diff...</span>
            </div>
          ) : error ? (
            <div className="git-diff-error">{error}</div>
          ) : original === '' && modified === '' ? (
            <div className="git-diff-empty">
              {mode === 'commit'
                ? 'Nenhuma alteração de conteúdo neste commit'
                : 'Sem alterações para exibir'}
            </div>
          ) : (
            <DiffEditor
              original={original}
              modified={modified}
              language="latex"
              theme="vs-dark"
              height="100%"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
