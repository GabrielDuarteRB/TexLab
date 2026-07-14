import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Save, Sparkles, Loader2, ChevronDown, ChevronUp, X, Check, Pencil, ArrowLeft, Download, Github, ArrowUp, ArrowDown } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import CompileErrorExplainer from '../ai/CompileErrorExplainer.jsx';
import Toast from '../ui/Toast.jsx';
import GitInitModal from '../ui/GitInitModal.jsx';
import GitPanel from '../ui/GitPanel.jsx';
import GitDiffModal from '../ui/GitDiffModal.jsx';
import ConfirmModal from '../ui/ConfirmModal.jsx';

export default function Toolbar({ onToggleAi, aiOpen, saveStatus }) {
  const navigate = useNavigate();
  const {
    saveAndCompile, compile, compiling, currentProject, currentFile, fileContents,
    compileResult, updateProject, pdfUrl, gitStatus, initGit,
    fetchGitStatus, fetchBranches, fetchGitLog, fetchGitDiff, fetchRemote,
    commitAll, pullBranch, pushBranch, clearGitConflicts,
  } = useProjectStore();
  const [showLog, setShowLog] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [toast, setToast] = useState(null);
  const [showInitModal, setShowInitModal] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [diffState, setDiffState] = useState({ open: false, mode: null, file: null, commit: null });
  const [confirmDirty, setConfirmDirty] = useState(null);
  const gitBtnRef = useRef(null);

  const hasGit = currentProject && gitStatus;
  const compileError = compileResult && !compileResult.success;

  useEffect(() => {
    if (!currentProject) return;
    Promise.all([
      fetchGitStatus(),
      fetchBranches(),
      fetchGitLog(5),
      fetchGitDiff(),
      fetchRemote(),
    ]);
  }, [currentProject?.id]);

  useEffect(() => {
    setShowLog(false);
  }, [compileResult]);

  const handleSave = () => {
    if (currentFile) {
      saveAndCompile(currentFile, fileContents[currentFile] || '');
    }
  };

  const handleDownload = async () => {
    if (!pdfUrl) return;
    try {
      const res = await fetch(pdfUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject?.name || 'document'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim()) {
      setRenaming(false);
      setRenameValue('');
      return;
    }
    await updateProject(renameValue.trim());
    setRenaming(false);
    setRenameValue('');
  };

  const handleInit = async ({ remoteUrl, userName, userEmail }) => {
    const res = await initGit({ remoteUrl, userName, userEmail });
    if (res.success) {
      setShowInitModal(false);
      setToast({ message: 'Repositório Git inicializado!', type: 'success' });
      await fetchGitStatus();
      await fetchBranches();
      await fetchGitLog(5);
      await fetchGitDiff();
    }
    return res;
  };

  const handleGitBtnClick = () => {
    if (!hasGit) {
      setShowInitModal(true);
    } else {
      setShowPanel((v) => !v);
    }
  };

  const handlePullClick = async () => {
    if (!hasGit) return;
    if (gitStatus.dirty) {
      setConfirmDirty({ op: 'pull' });
      return;
    }
    const res = await pullBranch();
    if (res.success) {
      setToast({ message: 'Pull realizado com sucesso', type: 'success' });
      await fetchGitStatus();
      await fetchGitLog(5);
      await fetchGitDiff();
    } else {
      setToast({ message: res.error || 'Erro no pull', type: 'error' });
    }
  };

  const handlePushClick = async () => {
    if (!hasGit) return;
    if (gitStatus.dirty) {
      setConfirmDirty({ op: 'push' });
      return;
    }
    const res = await pushBranch();
    if (res.success) {
      setToast({ message: 'Push realizado com sucesso', type: 'success' });
      await fetchGitStatus();
      await fetchGitLog(5);
    } else {
      setToast({ message: res.error || 'Erro no push', type: 'error' });
    }
  };

  const handleConfirmDirty = async () => {
    const op = confirmDirty?.op;
    setConfirmDirty(null);
    if (!op) return;
    const message = window.prompt(`Mensagem do commit antes de ${op === 'pull' ? 'pull' : 'push'}:`);
    if (!message || !message.trim()) {
      setToast({ message: 'Operação cancelada', type: 'error' });
      return;
    }
    const res = await commitAll(message.trim());
    if (!res.success) {
      setToast({ message: res.error || 'Erro no commit', type: 'error' });
      return;
    }
    if (op === 'pull') handlePullClick();
    else if (op === 'push') handlePushClick();
  };

  const handleDiffFile = (file) => {
    setDiffState({ open: true, mode: 'file', file, commit: null });
  };

  const handleDiffCommit = (commit) => {
    setDiffState({ open: true, mode: 'commit', file: null, commit });
  };

  return (
    <header className="toolbar-wrapper">
      <header className="toolbar">
        <div className="toolbar-left">
          <button className="icon-btn" onClick={() => navigate('/')} title="Voltar aos projetos">
            <ArrowLeft size={16} />
          </button>
          <h1 className="toolbar-title">TexLab</h1>
          {currentProject && (
            <>
              {renaming ? (
                <div className="toolbar-rename">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') { setRenaming(false); setRenameValue(''); }
                    }}
                    autoFocus
                  />
                  <button className="icon-btn small" onClick={handleRename}>
                    <Check size={12} />
                  </button>
                  <button className="icon-btn small" onClick={() => { setRenaming(false); setRenameValue(''); }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button className="toolbar-project-name" onClick={() => { setRenaming(true); setRenameValue(currentProject.name); }}>
                  {currentProject.name}
                  <Pencil size={12} className="toolbar-project-name-icon" />
                </button>
              )}
            </>
          )}
        </div>
        <div className="toolbar-center">
          {currentProject && (
            <>
              <button className="toolbar-btn" onClick={handleSave} disabled={!currentFile}>
                <Save size={16} />
                Salvar
              </button>
              <button className="toolbar-btn primary" onClick={compile} disabled={compiling}>
                {compiling ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                Compilar
              </button>
              <button className="toolbar-btn" onClick={handleDownload} disabled={!pdfUrl} title="Baixar PDF">
                <Download size={16} />
                Baixar PDF
              </button>
            </>
          )}
        </div>
        <div className="toolbar-right">
          {saveStatus === 'saving' && (
            <span className="compile-status">Salvando...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="compile-status success">Salvo</span>
          )}
          {currentProject && (
            <div className="toolbar-git-wrapper">
              <button
                ref={gitBtnRef}
                className={`toolbar-btn ${hasGit ? 'has-git' : ''} ${showPanel ? 'active' : ''}`}
                onClick={handleGitBtnClick}
                title={hasGit ? `Branch: ${gitStatus.branch}` : 'Inicializar Git'}
              >
                <Github size={16} />
                {hasGit ? (
                  <span className="toolbar-git-branch">{gitStatus.branch || '(sem branch)'}</span>
                ) : (
                  <span>Git</span>
                )}
              </button>
              {hasGit && (
                <div className="toolbar-git-counters">
                  <button
                    className="toolbar-git-counter"
                    onClick={handlePullClick}
                    disabled={gitStatus.behind === 0 || gitStatus.dirty}
                    title={
                      gitStatus.dirty
                        ? 'Faça commit das alterações antes de pull'
                        : gitStatus.behind === 0
                          ? 'Sem commits à frente do remote'
                          : `${gitStatus.behind} commit(s) atrás do remoto`
                    }
                  >
                    <ArrowDown size={12} />
                    <span>{gitStatus.behind}</span>
                  </button>
                  <button
                    className="toolbar-git-counter"
                    onClick={handlePushClick}
                    disabled={gitStatus.ahead === 0 || gitStatus.dirty}
                    title={
                      gitStatus.dirty
                        ? 'Faça commit das alterações antes de push'
                        : gitStatus.ahead === 0
                          ? 'Sem commits à frente'
                          : `${gitStatus.ahead} commit(s) à frente do remoto`
                    }
                  >
                    <ArrowUp size={12} />
                    <span>{gitStatus.ahead}</span>
                  </button>
                </div>
              )}
              <GitPanel
                open={showPanel}
                anchorRef={gitBtnRef}
                onClose={() => setShowPanel(false)}
                onDiffFile={handleDiffFile}
                onDiffCommit={handleDiffCommit}
                onToast={(message, type) => setToast({ message, type })}
              />
            </div>
          )}
          {currentProject && (
            <button
              className={`toolbar-btn ${aiOpen ? 'active' : ''}`}
              onClick={onToggleAi}
            >
              <Sparkles size={16} />
              IA
            </button>
          )}
          {compileError && (
            <button
              className="compile-status error compile-toggle"
              onClick={() => setShowLog(!showLog)}
            >
              Erro na compilação
              {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {compileResult && compileResult.success && (
            <span className="compile-status success">PDF gerado</span>
          )}
        </div>
      </header>
      {showLog && compileError && compileResult.log && (
        <div className="compile-error-panel">
          <div className="compile-error-header">
            <span>Log de compilação</span>
            <div className="compile-error-header-actions">
              <CompileErrorExplainer
                log={compileResult.log}
                fileContents={fileContents}
                currentFile={currentFile}
                updateFileContent={useProjectStore.getState().updateFileContent}
              />
              <button className="icon-btn small" onClick={() => setShowLog(false)}>
                <X size={14} />
              </button>
            </div>
          </div>
          <pre className="compile-error-log">{compileResult.log}</pre>
        </div>
      )}
      <Toast
        open={!!toast}
        message={toast?.message || ''}
        type={toast?.type || 'error'}
        onClose={() => setToast(null)}
      />
      <GitInitModal
        open={showInitModal}
        onConfirm={handleInit}
        onCancel={() => setShowInitModal(false)}
      />
      <GitDiffModal
        open={diffState.open}
        mode={diffState.mode}
        file={diffState.file}
        commit={diffState.commit}
        onClose={() => setDiffState({ open: false, mode: null, file: null, commit: null })}
      />
      <ConfirmModal
        open={!!confirmDirty}
        message={
          confirmDirty?.op === 'pull'
            ? 'Você tem alterações não commitadas. Quer fazer um commit antes do pull?'
            : 'Você tem alterações não commitadas. Quer fazer um commit antes do push?'
        }
        onConfirm={handleConfirmDirty}
        onCancel={() => setConfirmDirty(null)}
      />
    </header>
  );
}
