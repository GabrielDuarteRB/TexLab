import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  GitBranch, ChevronDown, Upload, Download, RefreshCw, GitCommit, Plus,
  Check, Loader2, GitMerge, AlertTriangle, FileText, FilePlus, FileMinus, FileEdit, FileQuestion,
  X, ChevronRight, ArrowDown, ArrowUp, Trash2,
} from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import { relativeTime } from '../../utils/relativeTime.js';
import Pagination from './Pagination.jsx';
import GitDiscardConfirmModal from './GitDiscardConfirmModal.jsx';

const HISTORY_PAGE_SIZE = 5;
const BRANCHES_PAGE_SIZE = 5;

const STATUS_CONFIG = {
  added: { icon: FilePlus, color: 'var(--success)', label: 'A' },
  modified: { icon: FileEdit, color: '#e0a800', label: 'M' },
  deleted: { icon: FileMinus, color: 'var(--error)', label: 'D' },
  untracked: { icon: FileQuestion, color: 'var(--text-muted)', label: '?' },
  renamed: { icon: FileEdit, color: '#89b4fa', label: 'R' },
  conflicted: { icon: AlertTriangle, color: 'var(--error)', label: '!' },
};

function StatusTag({ type }) {
  const config = STATUS_CONFIG[type] || STATUS_CONFIG.modified;
  return (
    <span className="git-status-tag" style={{ color: config.color }} title={config.label}>
      {config.label}
    </span>
  );
}

function BranchSubmenu({ onClose, onSelect, onCreate, onFetch, onPull, onPush, onMerge, dirty, ahead, behind, hasRemote, busy, branchesPage, branchesPageSize, onBranchesPageChange, onToast }) {
  const branches = useProjectStore((s) => s.branches);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [showMerge, setShowMerge] = useState(false);
  const [mergeSource, setMergeSource] = useState('');
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [actionReloading, setActionReloading] = useState(false);
  const inputRef = useRef(null);
  const mergeInputRef = useRef(null);

  const fetchBranches = useProjectStore((s) => s.fetchBranches);
  const fetchRemote = useProjectStore((s) => s.fetchRemote);
  const pullBranch = useProjectStore((s) => s.pullBranch);
  const pushBranch = useProjectStore((s) => s.pushBranch);
  const mergeBranch = useProjectStore((s) => s.mergeBranch);

  useEffect(() => {
    if (branches === null) {
      fetchBranches();
    }
  }, [branches, fetchBranches]);

  useEffect(() => {
    if (onBranchesPageChange) {
      onBranchesPageChange(1);
    }
  }, [branches, onBranchesPageChange]);

  const loading = branches === null || actionReloading;

  useEffect(() => {
    if (showCreate && inputRef.current) inputRef.current.focus();
  }, [showCreate]);

  useEffect(() => {
    if (showMerge && mergeInputRef.current) mergeInputRef.current.focus();
  }, [showMerge]);

  const handleSelect = async (name) => {
    setAction(name);
    setError(null);
    await onSelect(name);
    setAction(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setAction('create');
    setError(null);
    const name = newName.trim();
    const res = await onCreate(name);
    setAction(null);
    if (res && !res.success) {
      setError(res.error);
    } else {
      setNewName('');
      setShowCreate(false);
      onToast?.(`Branch "${name}" criada`, 'success');
    }
  };

  const handleFetch = async () => {
    setAction('fetch');
    setActionReloading(true);
    setError(null);
    const res = await fetchRemote();
    setAction(null);
    setActionReloading(false);
    if (res && !res.success) setError(res.error);
    if (!res || res.success) onToast?.('Busca concluída', 'success');
  };

  const handlePull = async () => {
    setAction('pull');
    setError(null);
    const res = await pullBranch();
    setAction(null);
    if (res && !res.success) setError(res.error);
    if (res && res.conflictFiles && res.conflictFiles.length) onClose();
    if (res && res.success) onToast?.('Pull realizado com sucesso', 'success');
  };

  const handlePush = async () => {
    setAction('push');
    setError(null);
    const res = await pushBranch();
    setAction(null);
    if (res && !res.success) setError(res.error);
    if (res && res.success) onToast?.('Push realizado com sucesso', 'success');
  };

  const handleMerge = async () => {
    if (!mergeSource.trim()) return;
    setAction('merge');
    setError(null);
    const res = await mergeBranch(mergeSource.trim());
    setAction(null);
    if (res && res.conflictFiles && res.conflictFiles.length) {
      onClose();
      return;
    }
    if (res && !res.success) {
      setError(res.error);
    } else {
      setMergeSource('');
      setShowMerge(false);
      onToast?.('Merge realizado com sucesso', 'success');
    }
  };

  return (
    <div className="git-panel-submenu" onClick={(e) => e.stopPropagation()}>
      <div className="git-panel-submenu-header">
        <span>Branches</span>
        <button className="icon-btn small" onClick={onClose} title="Voltar">
          <X size={12} />
        </button>
      </div>

      {error && <div className="git-panel-error">{error}</div>}

      <div className="git-panel-submenu-actions">
        <button
          className="git-panel-action"
          onClick={handleFetch}
          disabled={busy || action !== null}
        >
          {action === 'fetch' ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
          Buscar
        </button>
        <button
          className="git-panel-action"
          onClick={handlePull}
          disabled={busy || !hasRemote || action !== null}
          title={dirty ? 'Há alterações não commitadas' : `Pull (${behind} atrás)`}
        >
          {action === 'pull' ? <Loader2 size={12} className="spin" /> : <ArrowDown size={12} />}
          Pull {behind > 0 && <span className="git-panel-action-count">{behind}</span>}
        </button>
        <button
          className="git-panel-action"
          onClick={handlePush}
          disabled={busy || !hasRemote || dirty || action !== null}
          title={dirty ? 'Faça commit antes de push' : `Push (${ahead} à frente)`}
        >
          {action === 'push' ? <Loader2 size={12} className="spin" /> : <ArrowUp size={12} />}
          Push {ahead > 0 && <span className="git-panel-action-count">{ahead}</span>}
        </button>
        <button
          className="git-panel-action"
          onClick={() => setShowMerge((v) => !v)}
          disabled={busy || dirty || action !== null}
        >
          <GitMerge size={12} />
          Merge
        </button>
      </div>

      {showMerge && (
        <div className="git-panel-merge-input">
          <input
            ref={mergeInputRef}
            type="text"
            placeholder="Branch de origem"
            value={mergeSource}
            onChange={(e) => setMergeSource(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleMerge();
              if (e.key === 'Escape') { setShowMerge(false); setMergeSource(''); }
            }}
            disabled={action === 'merge'}
          />
          <button
            className="git-panel-action primary"
            onClick={handleMerge}
            disabled={action === 'merge' || !mergeSource.trim()}
          >
            {action === 'merge' ? <Loader2 size={12} className="spin" /> : 'Mesclar'}
          </button>
        </div>
      )}

      {showCreate ? (
        <div className="git-panel-create-input">
          <input
            ref={inputRef}
            type="text"
            placeholder="nome-da-branch"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowCreate(false); setNewName(''); }
            }}
            disabled={action === 'create'}
          />
          <button
            className="git-panel-action primary"
            onClick={handleCreate}
            disabled={action === 'create' || !newName.trim()}
          >
            {action === 'create' ? <Loader2 size={12} className="spin" /> : 'Criar'}
          </button>
        </div>
      ) : (
        <button
          className="git-panel-action full"
          onClick={() => setShowCreate(true)}
          disabled={action !== null}
        >
          <Plus size={12} />
          Nova branch
        </button>
      )}

      <div className="git-panel-submenu-divider" />

      <div className="git-panel-branch-list">
        {loading ? (
          <div className="git-panel-loading">
            <Loader2 size={14} className="spin" />
            <span>Carregando branches...</span>
          </div>
        ) : branches.length === 0 ? (
          <div className="git-panel-empty">Nenhuma branch encontrada</div>
        ) : (
          (() => {
            const page = branchesPage || 1;
            const size = branchesPageSize || BRANCHES_PAGE_SIZE;
            const start = (page - 1) * size;
            const slice = branches.slice(start, start + size);
            return slice.map((b) => (
              <button
                key={b.name}
                className={`git-panel-branch ${b.current ? 'current' : ''}`}
                onClick={() => !b.current && handleSelect(b.name)}
                disabled={b.current || action !== null}
              >
                {action === b.name ? (
                  <Loader2 size={12} className="spin" />
                ) : b.current ? (
                  <Check size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                <span className="git-panel-branch-name">{b.name}</span>
                {b.remote && <span className="git-panel-branch-remote">remota</span>}
              </button>
            ));
          })()
        )}
      </div>

      {branches && branches.length > (branchesPageSize || BRANCHES_PAGE_SIZE) && (
        <Pagination
          page={branchesPage || 1}
          total={branches.length}
          pageSize={branchesPageSize || BRANCHES_PAGE_SIZE}
          onChange={(p) => onBranchesPageChange && onBranchesPageChange(p)}
        />
      )}
    </div>
  );
}

export default function GitPanel({ open, anchorRef, onClose, onDiffFile, onDiffCommit, onViewInit, onToast }) {
  const gitStatus = useProjectStore((s) => s.gitStatus);
  const gitDiff = useProjectStore((s) => s.gitDiff);
  const gitLog = useProjectStore((s) => s.gitLog);
  const gitLogTotal = useProjectStore((s) => s.gitLogTotal);
  const gitLogPage = useProjectStore((s) => s.gitLogPage);
  const gitConflictFiles = useProjectStore((s) => s.gitConflictFiles);
  const fetchGitStatus = useProjectStore((s) => s.fetchGitStatus);
  const fetchGitDiff = useProjectStore((s) => s.fetchGitDiff);
  const fetchGitLog = useProjectStore((s) => s.fetchGitLog);
  const commitAll = useProjectStore((s) => s.commitAll);
  const checkoutBranch = useProjectStore((s) => s.checkoutBranch);
  const createBranch = useProjectStore((s) => s.createBranch);
  const openConflictFile = useProjectStore((s) => s.openConflictFile);
  const clearGitConflicts = useProjectStore((s) => s.clearGitConflicts);
  const discardChanges = useProjectStore((s) => s.discardChanges);
  const realtimeCheckEnabled = useProjectStore((s) => s.realtimeCheckEnabled);

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [error, setError] = useState(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [branchesPage, setBranchesPage] = useState(1);
  const [discarding, setDiscarding] = useState(false);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      if (anchorRef?.current && anchorRef.current.contains(e.target)) return;
      if (e.target.closest('.confirm-modal-overlay')) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (open) {
      setMessage('');
      setError(null);
      setShowBranches(false);
      setBranchesPage(1);
      fetchGitStatus();
      fetchGitDiff();
      fetchGitLog(1, HISTORY_PAGE_SIZE);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, fetchGitStatus, fetchGitDiff, fetchGitLog]);

  useEffect(() => {
    if (open && realtimeCheckEnabled === false) {
      fetchGitStatus();
      fetchGitDiff();
    }
  }, [open, realtimeCheckEnabled, fetchGitStatus, fetchGitDiff]);

  const handleCommit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await commitAll(message.trim());
    setSubmitting(false);
    if (res.success) {
      setMessage('');
      fetchGitStatus();
      fetchGitDiff();
      fetchGitLog(1, HISTORY_PAGE_SIZE);
      onToast?.('Commit realizado com sucesso', 'success');
    } else {
      setError(res.error);
    }
  };

  const handleCheckout = async (name) => {
    const res = await checkoutBranch(name);
    if (!res.success) {
      setError(res.error);
    } else {
      fetchGitStatus();
      fetchGitDiff();
      fetchGitLog(1, HISTORY_PAGE_SIZE);
      onToast?.(`Trocou para a branch "${name}"`, 'success');
    }
  };

  const handleClearConflictMarkers = async () => {
    await clearGitConflicts();
    onToast?.('Marcadores de conflito removidos', 'success');
  };

  const handleCreate = async (name) => {
    return await createBranch(name);
  };

  const handleConflictClick = async (file) => {
    await openConflictFile(file);
    onClose();
  };

  const handleHistoryPageChange = (page) => {
    fetchGitLog(page, HISTORY_PAGE_SIZE);
  };

  const handleDiscardConfirm = async () => {
    setDiscarding(true);
    setError(null);
    const res = await discardChanges();
    setDiscarding(false);
    setShowDiscardModal(false);
    if (!res.success) {
      setError(res.error);
    } else {
      fetchGitLog(1, HISTORY_PAGE_SIZE);
      onToast?.('Alterações descartadas', 'success');
    }
  };

  if (!open || !gitStatus) return null;

  const pos = anchorRef?.current?.getBoundingClientRect();
  const top = pos ? pos.bottom + 6 : 0;
  const right = pos ? window.innerWidth - pos.right : 16;
  const left = pos ? (pos.left - 136) : 16;

  const canDiscard = gitDiff.length > 0 && gitConflictFiles.length === 0 && !discarding;

  return (
    createPortal(
      <div
        ref={panelRef}
        className="git-panel"
        style={{ top: `${top}px`, left: `${left}px`, right: `${right}px` }}
      >
        <div className="git-panel-header">
          <button
            className="git-panel-branch-button"
            onClick={() => setShowBranches((v) => !v)}
            title="Trocar branch"
          >
            <GitBranch size={14} />
            <span className="git-panel-branch-name-strong">{gitStatus.branch || '(sem branch)'}</span>
            <ChevronDown size={12} />
          </button>
          <div className="git-panel-counters">
            {gitStatus.hasRemote && (
              <>
                <span className="git-panel-counter" title="Commits à frente do remote">
                  <ArrowUp size={11} />{gitStatus.ahead}
                </span>
                <span className="git-panel-counter" title="Commits atrás do remote">
                  <ArrowDown size={11} />{gitStatus.behind}
                </span>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="git-panel-error">
            <AlertTriangle size={12} />
            <span>{error}</span>
            <button className="icon-btn small" onClick={() => setError(null)}>
              <X size={10} />
            </button>
          </div>
        )}

        {showBranches ? (
          <BranchSubmenu
            branchesPage={branchesPage}
            branchesPageSize={BRANCHES_PAGE_SIZE}
            onBranchesPageChange={setBranchesPage}
            onClose={() => setShowBranches(false)}
            onSelect={handleCheckout}
            onCreate={handleCreate}
            onFetch={async () => { await fetchGitLog(1, HISTORY_PAGE_SIZE); }}
            onPull={async () => { fetchGitStatus(); fetchGitLog(1, HISTORY_PAGE_SIZE); }}
            onPush={async () => { fetchGitStatus(); fetchGitLog(1, HISTORY_PAGE_SIZE); }}
            onMerge={async () => { fetchGitStatus(); fetchGitLog(1, HISTORY_PAGE_SIZE); }}
            onToast={onToast}
            dirty={gitStatus.dirty}
            ahead={gitStatus.ahead}
            behind={gitStatus.behind}
            hasRemote={gitStatus.hasRemote}
            busy={submitting}
          />
        ) : (
          <>
            <div className="git-panel-section git-panel-commit">
              <textarea
                ref={inputRef}
                className="git-panel-message"
                placeholder="Mensagem do commit (Ctrl+Enter para commitar)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && message.trim()) {
                    handleCommit();
                  }
                }}
                rows={3}
                disabled={submitting}
              />
              <button
                className="git-panel-commit-btn"
                onClick={handleCommit}
                disabled={!message.trim() || submitting || !gitStatus.dirty}
                title={!gitStatus.dirty ? 'Nada para commitar' : 'Commitar'}
              >
                {submitting ? <Loader2 size={14} className="spin" /> : <GitCommit size={14} />}
                <span>Commitar</span>
              </button>
            </div>

            {gitConflictFiles.length > 0 && (
              <div className="git-panel-section">
                <div className="git-panel-section-title">
                  <AlertTriangle size={12} className="git-panel-conflict-icon" />
                  <span>Conflitos ({gitConflictFiles.length})</span>
                  <button
                    className="icon-btn small"
                    onClick={handleClearConflictMarkers}
                    title="Ignorar lista (já resolvidos?)"
                  >
                    <X size={10} />
                  </button>
                </div>
                <ul className="git-panel-conflict-list">
                  {gitConflictFiles.map((file) => (
                    <li
                      key={file}
                      className="git-panel-conflict-item"
                      onClick={() => handleConflictClick(file)}
                    >
                      <StatusTag type="conflicted" />
                      <span className="git-panel-file-path">{file}</span>
                    </li>
                  ))}
                </ul>
                <p className="git-panel-hint">
                  Clique em um arquivo para abrir no editor e resolver os marcadores.
                </p>
              </div>
            )}

            <div className="git-panel-section">
              <div className="git-panel-section-title">
                <span>Alterações ({gitDiff.length})</span>
                {canDiscard && (
                  <button
                    className="git-panel-section-action"
                    onClick={() => setShowDiscardModal(true)}
                    title="Descartar todas as alterações"
                  >
                    <Trash2 size={11} />
                    Descartar
                  </button>
                )}
              </div>
              {gitDiff.length === 0 ? (
                <p className="git-panel-empty">Nenhuma alteração pendente</p>
              ) : (
                <ul className="git-panel-file-list">
                  {gitDiff.map((file) => (
                    <li
                      key={file.path}
                      className="git-panel-file-item"
                      onClick={() => onDiffFile && onDiffFile(file)}
                    >
                      <StatusTag type={file.type} />
                      <span className="git-panel-file-path">{file.path}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="git-panel-section">
              <div className="git-panel-section-title">
                <span>Histórico</span>
              </div>
              {gitLog.length === 0 ? (
                <p className="git-panel-empty">Sem commits ainda</p>
              ) : (
                <>
                  <ul className="git-panel-log">
                    {gitLog.map((c) => (
                      <li
                        key={c.hash}
                        className="git-panel-log-item"
                        onClick={() => onDiffCommit && onDiffCommit(c)}
                        title={`${c.message}\n\n${c.author} <${c.email}> · ${c.date}`}
                      >
                        <div className="git-panel-log-row">
                          <span className="git-panel-log-hash">{c.shortHash}</span>
                          <span className="git-panel-log-meta">
                            {c.author} · {relativeTime(c.date)}
                          </span>
                        </div>
                        <div className="git-panel-log-message">{c.message}</div>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={gitLogPage}
                    total={gitLogTotal}
                    pageSize={HISTORY_PAGE_SIZE}
                    onChange={handleHistoryPageChange}
                  />
                </>
              )}
            </div>
          </>
        )}

        <GitDiscardConfirmModal
          open={showDiscardModal}
          files={gitDiff}
          onConfirm={handleDiscardConfirm}
          onCancel={() => setShowDiscardModal(false)}
        />
      </div>,
      document.body,
    )
  );
}
