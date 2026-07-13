import { useEffect, useState } from 'react';
import { Image as ImageIcon, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import { api } from '../../services/api.js';
import ImageBrowser from './ImageBrowser.jsx';

function defaultLabelFromName(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}

export default function ImageForm({ editor, monaco, insertSnippet, onCancel, onInserted }) {
  const { currentProject } = useProjectStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('pick');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadDest, setUploadDest] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [label, setLabel] = useState('');
  const [width, setWidth] = useState('0.8');
  const [creatingDefault, setCreatingDefault] = useState(false);

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    api.getImageFolders(currentProject.id)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentProject]);

  const handleCreateDefault = async () => {
    if (!currentProject) return;
    setCreatingDefault(true);
    try {
      const res = await api.createDefaultImageFolder(currentProject.id);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingDefault(false);
    }
  };

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    setLabel(defaultLabelFromName(file.name));
  };

  const handleUpload = async () => {
    if (!uploadName.trim() || !uploadDest) return;
    setUploading(true);
    try {
      const blob = await fetch(uploadBlobUrl).then((r) => r.blob());
      const file = new File([blob], uploadName.trim(), { type: blob.type });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderPath', uploadDest);
      const res = await fetch(`/api/projects/${currentProject.id}/files`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      const json = await res.json();
      const newFile = json.filename;
      setSelectedFile({ path: newFile, name: uploadName.trim() });
      setLabel(defaultLabelFromName(uploadName.trim()));
      setMode('pick');
      const refreshed = await api.getImageFolders(currentProject.id);
      setData(refreshed);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const [uploadBlobUrl, setUploadBlobUrl] = useState(null);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadBlobUrl) URL.revokeObjectURL(uploadBlobUrl);
    setUploadBlobUrl(URL.createObjectURL(file));
    setUploadName(file.name);
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;
    try {
      const res = await api.resolveImagePath(currentProject.id, selectedFile.path);
      const relativePath = res.relativePath;
      const widthValue = width.trim() ? `${width.trim()}\\textwidth` : '0.8\\textwidth';
      const cap = caption.trim() || 'TODO: legenda';
      const lbl = label.trim() || 'fig:' + defaultLabelFromName(selectedFile.name);
      const body =
        `\\begin{figure}[htbp]\n` +
        `  \\centering\n` +
        `  \\includegraphics[width=${widthValue}]{${relativePath}}\n` +
        `  \\caption{${cap}}\n` +
        `  \\label{${lbl}}\n` +
        `\\end{figure}\n`;
      insertSnippet(editor, monaco, body);
      onInserted();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="slash-form-loading">Carregando pastas de imagens…</div>;
  }

  if (error) {
    return (
      <div className="slash-form-error">
        <AlertCircle size={16} /> <span>{error}</span>
        <button className="link-btn" onClick={() => { setError(null); setLoading(true); }}>
          <RefreshCw size={12} /> Tentar de novo
        </button>
      </div>
    );
  }

  const noRoots = !data || !data.roots || data.roots.length === 0;
  if (noRoots && mode === 'pick') {
    return (
      <div className="slash-form-fields">
        <div className="image-form-empty">
          <AlertCircle size={16} />
          <p>Nenhuma pasta de imagens encontrada neste projeto.</p>
        </div>
        <div className="slash-form-actions">
          <button className="confirm-modal-btn cancel" onClick={onCancel}>Cancelar</button>
          <button
            className="confirm-modal-btn confirm"
            onClick={handleCreateDefault}
            disabled={creatingDefault}
          >
            {creatingDefault ? 'Criando…' : 'Criar pasta images/'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'upload') {
    return (
      <div className="slash-form-fields">
        <div className="slash-form-field">
          <label>Arquivo</label>
          <input type="file" accept="image/*,.pdf,.eps" onChange={handleFileInput} />
        </div>
        {uploadName && (
          <div className="slash-form-field">
            <label>Nome do arquivo</label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />
          </div>
        )}
        {uploadName && (
          <div className="slash-form-field">
            <label>Pasta de destino</label>
            <ImageBrowser
              roots={data.roots}
              mode="pickFolder"
              onPick={(node) => setUploadDest(node.path)}
              initialPath={uploadDest}
            />
            {uploadDest && <div className="image-form-dest-preview">→ {uploadDest}/</div>}
          </div>
        )}
        <div className="slash-form-actions">
          <button className="confirm-modal-btn cancel" onClick={() => setMode('pick')}>Voltar</button>
          <button
            className="confirm-modal-btn confirm"
            onClick={handleUpload}
            disabled={!uploadName.trim() || !uploadDest || uploading}
          >
            {uploading ? 'Enviando…' : 'Enviar e selecionar'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'pick' && selectedFile) {
    return (
      <div className="slash-form-fields">
        <div className="image-form-selected">
          <ImageIcon size={14} />
          <span>{selectedFile.path}</span>
          <button className="link-btn" onClick={() => setSelectedFile(null)}>Trocar</button>
        </div>
        <div className="slash-form-field">
          <label>Legenda (\caption)</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Descrição da imagem"
          />
        </div>
        <div className="slash-form-field">
          <label>Label (\label)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="fig:nome"
          />
        </div>
        <div className="slash-form-field">
          <label>Largura (fração de \textwidth)</label>
          <input
            type="text"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="0.8"
          />
        </div>
        <div className="slash-form-actions">
          <button className="confirm-modal-btn cancel" onClick={onCancel}>Cancelar</button>
          <button className="confirm-modal-btn confirm" onClick={handleConfirm}>
            Inserir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="slash-form-fields">
      <div className="image-form-mode-tabs">
        <button
          className={`image-form-mode-tab ${mode === 'pick' ? 'active' : ''}`}
          onClick={() => setMode('pick')}
        >
          <ImageIcon size={12} /> Escolher imagem
        </button>
        <button
          className={`image-form-mode-tab ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => setMode('upload')}
        >
          <Upload size={12} /> Enviar nova
        </button>
      </div>
      <div className="slash-form-field">
        <label>Selecione uma imagem</label>
        <ImageBrowser
          roots={data.roots}
          mode="pickFile"
          onPick={handleFileSelected}
        />
      </div>
      <div className="slash-form-actions">
        <button className="confirm-modal-btn cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
