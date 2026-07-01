import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import Sidebar from '../sidebar/ProjectList.jsx';
import Toolbar from '../toolbar/Toolbar.jsx';
import TexLabEditor from '../editor/TexLabEditor.jsx';
import PdfViewer from '../pdf/PdfViewer.jsx';
import PdfOutline from '../pdf/PdfOutline.jsx';
import AiPanel from '../ai/AiPanel.jsx';

export default function AppLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const { currentProject, currentFile, fileContents, saveAndCompile, selectProject, loading } = useProjectStore();

  useEffect(() => {
    if (id) {
      selectProject(id);
    }
  }, [id, selectProject]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentFile) {
          setSaveStatus('saving');
          saveAndCompile(currentFile, fileContents[currentFile] || '').then(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 2000);
          });
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentFile, fileContents, saveAndCompile]);

  if (!currentProject) {
    return (
      <div className="app-layout">
        <div className="pdf-empty"><p>Carregando projeto...</p></div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Toolbar onToggleAi={() => setAiOpen(!aiOpen)} aiOpen={aiOpen} saveStatus={saveStatus} />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <div className="editor-pdf-split">
            <div className="editor-pane">
              <TexLabEditor />
            </div>
            <div className="pdf-pane">
              <PdfOutline />
              <PdfViewer />
            </div>
          </div>
        </main>
        {aiOpen && <AiPanel onClose={() => setAiOpen(false)} />}
      </div>
      {loading && (
        <div className="loading-overlay">
          <Loader2 size={32} className="spin" />
          <p>Trocando de branch...</p>
        </div>
      )}
    </div>
  );
}
