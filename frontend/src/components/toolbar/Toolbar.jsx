import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Save, Sparkles, Loader2, ChevronDown, ChevronUp, X, Check, Pencil, ArrowLeft, Download, Github } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import CompileErrorExplainer from '../ai/CompileErrorExplainer.jsx';
import Toast from '../ui/Toast.jsx';
import GitInitModal from '../ui/GitInitModal.jsx';
import GitBranchDropdown from '../ui/GitBranchDropdown.jsx';
import GitCommitModal from '../ui/GitCommitModal.jsx';
import GitDiffModal from '../ui/GitDiffModal.jsx';
import GitCheckoutWarningModal from '../ui/GitCheckoutWarningModal.jsx';
import GitConflictModal from '../ui/GitConflictModal.jsx';

export default function Toolbar({ onToggleAi, aiOpen, saveStatus }) {
  const navigate = useNavigate();
  const {
    saveAndCompile, compile, compiling, currentProject, currentFile, fileContents,
    compileResult, updateProject, pdfUrl, initGit, updateFileContent,
    gitStatus, branches, fetchGitStatus, fetchBranches, fetchGitDiff, gitDiff,
    createBranch, checkoutBranch, commitAll, pushBranch, abortStashPop, fetchRemote,
    saveFile, addFile, finalizeStash,
  } = useProjectStore();
  const [showLog, setShowLog] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [gitLoading, setGitLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showGitModal, setShowGitModal] = useState(false);
  const [showGitDropdown, setShowGitDropdown] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [showCheckoutWarning, setShowCheckoutWarning] = useState(false);
  const [checkoutTargetBranch, setCheckoutTargetBranch] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictFiles, setConflictFiles] = useState([]);
  const [originalBranch, setOriginalBranch] = useState(null);
  const gitBtnRef = useRef(null);

  const hasGit = currentProject && gitStatus;
  const compileError = compileResult && !compileResult.success;

  useEffect(() => {
    if (currentProject) {
      fetchGitStatus();
      fetchBranches();
    }
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

  const handleInitGit = async (remoteUrl) => {
    setGitLoading(true);
    try {
      const result = await initGit(remoteUrl);
      if (result.success) {
        setToast({ message: 'Repositório Git inicializado com sucesso!', type: 'success' });
        await fetchGitStatus();
        await fetchBranches();
      } else {
        setToast({ message: result.error || 'Erro ao inicializar Git', type: 'error' });
      }
    } catch (err) {
      setToast({ message: err.message || 'Erro ao inicializar Git', type: 'error' });
    }
    setGitLoading(false);
    setShowGitModal(false);
  };

  const handleGitBtnClick = () => {
    if (!hasGit) {
      setShowGitModal(true);
    } else {
      setShowGitDropdown(!showGitDropdown);
    }
  };

  const handleCheckout = async (name) => {
    setShowGitDropdown(false);
    const branchExists = branches.some(b => b.name === name && !b.current);
    if (gitStatus?.dirty && branchExists) {
      await fetchGitDiff();
      setCheckoutTargetBranch(name);
      setShowCheckoutWarning(true);
      return;
    }
    await doCheckout(name, true);
  };

  const doCheckout = async (name, keepChanges = true) => {
    const result = await checkoutBranch(name, keepChanges);
    if (result.success) {
      if (result.stashConflict) {
        setConflictFiles(result.conflicts || []);
        setOriginalBranch(result.originalBranch || null);
        setShowConflictModal(true);
      } else {
        setToast({ message: `Branch alterada para "${name}"`, type: 'success' });
      }
    } else {
      setToast({ message: result.error || 'Erro ao trocar branch', type: 'error' });
    }
  };

  const handleConfirmCheckout = async (keepChanges) => {
    setShowCheckoutWarning(false);
    await doCheckout(checkoutTargetBranch, keepChanges);
  };

  const handleResolveFile = async (filepath, content) => {
    await saveFile(filepath, content);
    await addFile(filepath);
  };

  const handleFinalizeConflicts = async () => {
    await finalizeStash();
    setShowConflictModal(false);
    setOriginalBranch(null);
    setToast({ message: 'Conflitos resolvidos com sucesso!', type: 'success' });
  };

  const handleCreateBranch = async (name) => {
    const result = await createBranch(name);
    if (result.success) {
      setToast({ message: `Branch "${name}" criada`, type: 'success' });
    } else {
      setToast({ message: result.error || 'Erro ao criar branch', type: 'error' });
    }
  };

  const handleCommit = async (message) => {
    const result = await commitAll(message);
    if (result.success) {
      setToast({ message: 'Commit realizado com sucesso!', type: 'success' });
    } else {
      setToast({ message: result.error || 'Erro ao commitar', type: 'error' });
    }
    setShowCommitModal(false);
  };

  const handleCommitFromDropdown = async () => {
    setShowGitDropdown(false);
    setShowCommitModal(true);
  };

  const handlePush = async () => {
    const result = await pushBranch();
    if (result.success) {
      setToast({ message: 'Push realizado com sucesso!', type: 'success' });
    } else {
      setToast({ message: result.error || 'Erro ao fazer push', type: 'error' });
    }
    setShowGitDropdown(false);
  };

  const handleFetch = async () => {
    const result = await fetchRemote();
    if (result?.success) {
      setToast({ message: 'Branchs atualizadas', type: 'success' });
    } else {
      setToast({ message: result?.error || 'Erro ao buscar branches', type: 'error' });
    }
  };

  const handleViewDiff = async () => {
    setShowGitDropdown(false);
    await fetchGitDiff();
    setShowDiffModal(true);
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
                className={`toolbar-btn ${hasGit ? 'has-git' : ''}`}
                onClick={handleGitBtnClick}
                disabled={gitLoading}
                title={hasGit ? `Branch: ${gitStatus.branch}` : 'Inicializar Git'}
              >
                {gitLoading ? <Loader2 size={16} className="spin" /> : <Github size={16} />}
                {hasGit ? gitStatus.branch : 'Git'}
              </button>
              <GitBranchDropdown
                open={showGitDropdown}
                anchorRef={gitBtnRef}
                branches={branches}
                gitStatus={gitStatus}
                onCheckout={handleCheckout}
                onCreateBranch={handleCreateBranch}
                onFetch={handleFetch}
                onCommit={handleCommitFromDropdown}
                onPush={handlePush}
                onViewDiff={handleViewDiff}
                onClose={() => setShowGitDropdown(false)}
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
                updateFileContent={updateFileContent}
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
        open={showGitModal}
        onConfirm={handleInitGit}
        onCancel={() => setShowGitModal(false)}
      />
      <GitCommitModal
        open={showCommitModal}
        gitStatus={gitStatus}
        onConfirm={handleCommit}
        onCancel={() => setShowCommitModal(false)}
      />
      <GitDiffModal
        open={showDiffModal}
        files={gitDiff}
        branchName={gitStatus?.branch || ''}
        onClose={() => setShowDiffModal(false)}
      />
      <GitCheckoutWarningModal
        open={showCheckoutWarning}
        files={gitDiff}
        branchName={checkoutTargetBranch || ''}
        onConfirm={handleConfirmCheckout}
        onCancel={() => setShowCheckoutWarning(false)}
      />
      <GitConflictModal
        open={showConflictModal}
        files={conflictFiles}
        branchName={checkoutTargetBranch || ''}
        onResolveFile={handleResolveFile}
        onFinalize={handleFinalizeConflicts}
        onClose={() => setShowConflictModal(false)}
      />
    </header>
  );
}
