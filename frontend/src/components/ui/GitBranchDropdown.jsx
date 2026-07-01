import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GitBranch, Plus, Check, Loader2, GitCommit, Upload, ChevronRight, FileSearch, RefreshCw } from 'lucide-react';

export default function GitBranchDropdown({
  open,
  anchorRef,
  branches,
  gitStatus,
  onCheckout,
  onCreateBranch,
  onFetch,
  onCommit,
  onPush,
  onViewDiff,
  onClose,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [loading, setLoading] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (showCreate && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCreate]);

  useEffect(() => {
    if (open) {
      setShowCreate(false);
      setNewBranchName('');
      setLoading(null);
    }
  }, [open]);

  const handleCheckout = async (name) => {
    setLoading(name);
    await onCheckout(name);
    setLoading(null);
  };

  const handleCreate = async () => {
    if (!newBranchName.trim()) return;
    setLoading('create');
    await onCreateBranch(newBranchName.trim());
    setNewBranchName('');
    setShowCreate(false);
    setLoading(null);
  };

  const handleFetch = async () => {
    setLoading('fetch');
    await onFetch();
    setLoading(null);
  };

  const handleCommit = async () => {
    setLoading('commit');
    await onCommit();
    setLoading(null);
  };

  const handlePush = async () => {
    setLoading('push');
    await onPush();
    setLoading(null);
  };

  if (!open) return null;

  const pos = anchorRef.current?.getBoundingClientRect();
  const top = pos ? pos.bottom + 4 : 0;
  const right = pos ? window.innerWidth - pos.right : 0;

  return createPortal(
    <div
      ref={dropdownRef}
      className="git-dropdown"
      style={{ top: `${top}px`, right: `${right}px` }}
    >
      {gitStatus && (
        <div className="git-dropdown-header">
          <GitBranch size={14} />
          <span className="git-dropdown-branch">{gitStatus.branch}</span>
          {gitStatus.dirty && (
            <span className="git-dropdown-dirty">{gitStatus.changes} alterações</span>
          )}
        </div>
      )}

      <div className="git-dropdown-section">
        <div className="git-dropdown-section-title">Branches</div>
        {branches.map((b) => (
          <button
            key={b.name}
            className={`git-dropdown-item ${b.current ? 'active' : ''}`}
            onClick={() => !b.current && handleCheckout(b.name)}
            disabled={b.current || loading}
          >
            {loading === b.name ? (
              <Loader2 size={14} className="spin" />
            ) : b.current ? (
              <Check size={14} />
            ) : (
              <ChevronRight size={14} className="git-dropdown-item-icon" />
            )}
            <span>{b.name}</span>
            {b.remote && <span className="git-dropdown-remote-badge">remota</span>}
          </button>
        ))}
      </div>

      <div className="git-dropdown-divider" />

      <div className="git-dropdown-section">
        <button
          className="git-dropdown-item"
          onClick={handleFetch}
          disabled={loading}
        >
          {loading === 'fetch' ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <RefreshCw size={14} className="git-dropdown-item-icon" />
          )}
          <span>Buscar branches remotas</span>
        </button>
        {showCreate ? (
          <div className="git-dropdown-create">
            <input
              ref={inputRef}
              type="text"
              className="git-dropdown-input"
              placeholder="Nome da branch"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setShowCreate(false); setNewBranchName(''); }
              }}
              disabled={loading === 'create'}
            />
            <div className="git-dropdown-create-actions">
              <button
                className="git-dropdown-create-btn"
                onClick={() => { setShowCreate(false); setNewBranchName(''); }}
                disabled={loading === 'create'}
              >
                Cancelar
              </button>
              <button
                className="git-dropdown-create-btn primary"
                onClick={handleCreate}
                disabled={loading === 'create' || !newBranchName.trim()}
              >
                {loading === 'create' ? <Loader2 size={12} className="spin" /> : 'Criar'}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="git-dropdown-item"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} className="git-dropdown-item-icon" />
            <span>Nova Branch</span>
          </button>
        )}
      </div>

      <div className="git-dropdown-divider" />

      <div className="git-dropdown-section">
        <button
          className="git-dropdown-item"
          onClick={onViewDiff}
          disabled={loading}
        >
          <FileSearch size={14} className="git-dropdown-item-icon" />
          <span>Ver alterações</span>
        </button>
        <button
          className="git-dropdown-item"
          onClick={handleCommit}
          disabled={loading || !gitStatus?.dirty}
        >
          {loading === 'commit' ? <Loader2 size={14} className="spin" /> : <GitCommit size={14} className="git-dropdown-item-icon" />}
          <span>Commitar</span>
        </button>
        <button
          className="git-dropdown-item"
          onClick={handlePush}
          disabled={loading || !gitStatus?.hasRemote}
        >
          {loading === 'push' ? <Loader2 size={14} className="spin" /> : <Upload size={14} className="git-dropdown-item-icon" />}
          <span>Push</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
