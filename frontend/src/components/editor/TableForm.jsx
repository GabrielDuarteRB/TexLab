import { useState } from 'react';

function placeholder(i, def) {
  return '${' + i + (def !== undefined ? ':' + def : '') + '}';
}

const LINE_BREAK = String.raw`\\\\`;

function buildRow(cells) {
  return cells.join(' & ') + ' ' + LINE_BREAK;
}

function gerarTabela({ colunas, linhas, comCabecalho, legenda, label }) {
  const cols = Math.max(1, Math.min(10, parseInt(colunas, 10) || 4));
  const rows = Math.max(1, Math.min(50, parseInt(linhas, 10) || 2));
  const sep = 'c'.repeat(cols);

  const lines = [];
  lines.push('\\begin{table}[h]');
  lines.push('    \\centering');
  lines.push(`    \\begin{tabular}{${sep}}`);

  let nextIndex = 1;

  if (comCabecalho) {
    const headers = [];
    for (let i = 0; i < cols; i++) {
      headers.push(placeholder(nextIndex++, `Cabeçalho ${i + 1}`));
    }
    lines.push('        \\toprule');
    lines.push('        ' + buildRow(headers));
    lines.push('        \\midrule');
  }

  for (let r = 0; r < rows; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) {
        cells.push(placeholder(nextIndex++));
      } else {
        cells.push('');
      }
    }
    lines.push('        ' + buildRow(cells));
  }

  lines.push('        \\bottomrule');
  lines.push('    \\end{tabular}');
  lines.push(`    \\caption{${legenda || ''}}`);
  lines.push(`    \\label{${label || ''}}`);
  lines.push('\\end{table}');

  return lines.join('\n');
}

export default function TableForm({ onConfirm, onCancel }) {
  const [colunas, setColunas] = useState(4);
  const [linhas, setLinhas] = useState(2);
  const [comCabecalho, setComCabecalho] = useState(true);
  const [legenda, setLegenda] = useState('');
  const [label, setLabel] = useState('');

  const handleSubmit = () => {
    const body = gerarTabela({ colunas, linhas, comCabecalho, legenda, label });
    onConfirm(body);
  };

  return (
    <div className="slash-form-fields">
      <div className="slash-form-field">
        <label>Colunas</label>
        <input
          type="number"
          min={1}
          max={10}
          value={colunas}
          onChange={(e) => setColunas(e.target.value)}
          autoFocus
        />
      </div>
      <div className="slash-form-field">
        <label>Linhas (sem cabeçalho)</label>
        <input
          type="number"
          min={1}
          max={50}
          value={linhas}
          onChange={(e) => setLinhas(e.target.value)}
        />
      </div>
      <div className="slash-form-field slash-form-field-checkbox">
        <label>
          <input
            type="checkbox"
            checked={comCabecalho}
            onChange={(e) => setComCabecalho(e.target.checked)}
          />
          <span>Primeira linha é cabeçalho</span>
        </label>
      </div>
      <div className="slash-form-field">
        <label>Legenda (caption)</label>
        <input
          type="text"
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          placeholder="Descrição da tabela"
        />
      </div>
      <div className="slash-form-field">
        <label>Rótulo (label para \ref{})</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="tab:minha-tabela"
        />
      </div>
      <p className="slash-form-hint">
        Requer <code>\usepackage{'{booktabs}'}</code> no preâmbulo.
      </p>
      <div className="slash-form-actions">
        <button className="confirm-modal-btn cancel" onClick={onCancel}>
          Cancelar
        </button>
        <button className="confirm-modal-btn confirm" onClick={handleSubmit}>
          Inserir
        </button>
      </div>
    </div>
  );
}
